import { FC, ReactNode, useCallback, useRef, useState } from "react";
import { ArrowRightOutlined, CheckOutlined, CloseOutlined, LoadingOutlined } from "@ant-design/icons";
import { client } from "@/client";
import { QuestionType, RoundType, Screen } from "@/data";
import { useGameStore, type GameState, type PlayerView } from "@/store/game";
import { NEXT_KEY, NO_BUZZER_ATTRIBUTE } from "@/hooks/useKeyPress";
import { useNextKey } from "@/hooks/useNextKey";
import { useCooldown } from "@/hooks/useCooldown";
import { isRemovingFinalThemes } from "@/utils/table";
import { notifyError } from "@/utils/notify";
import { FitText } from "../FitText";

type NextStep = "answer" | "page" | "end" | "results";

type NextAction =
  | { kind: "button"; label: string; enabled: boolean }
  | { kind: "hint"; label: string };

const SCREEN_LABELS: Partial<Record<Screen, string>> = {
  [Screen.Screensaver]: "Начать игру",
  [Screen.ThemeList]: "К раунду",
  [Screen.RoundName]: "Темы раунда",
  [Screen.ThemeListInRound]: "К табло",
  [Screen.QuestionPreparation]: "Показать вопрос",
};

const QUESTION_LABELS: Record<NextStep, string> = {
  answer: "Показать ответ",
  page: "Дальше",
  end: "К табло",
  results: "Итоги раунда",
};

const TABLE_HINT = "Выберите вопрос на табло";
const FINAL_REMOVE_HINT = "Нажмите на тему, чтобы убрать её";
const FINAL_OPEN_HINT = "Откройте последнюю тему";
const RESULTS_LABEL = "Итоги раунда";

const JUDGE_COOLDOWN_MS = 700;

const ANSWER_SHOWN = { full: "Ответ показан", short: "Ответ показан" };
const PICK_PLAYER = { full: "Выберите отвечающего в таблице", short: "Выберите игрока" };
const NOBODY = { full: "Никто не нажал", short: "Никто не нажал" };

const LONG_NAME = 20;

const EDGE_TO_EDGE = new Set<Screen | null>([Screen.Screensaver, Screen.Table, Screen.Results]);

const noBuzzer = { [NO_BUZZER_ATTRIBUTE]: "" };

const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300";

const JUDGE_BUTTON = `flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none ${FOCUS_RING}`;

const isLastQuestionOfRound = (state: GameState): boolean => {
  const progress = state.progress;
  return !!progress && progress.questionsTotal > 0 && progress.questionsPlayed >= progress.questionsTotal - 1;
};

const nextStepOf = (state: GameState): NextStep => {
  const next = state.questionPage?.nextPage;
  if (next) {
    return next.isMarker ? "answer" : "page";
  }
  return isLastQuestionOfRound(state) ? "results" : "end";
};

const roundPlayedOf = (state: GameState): boolean => {
  const progress = state.progress;
  return !!progress && progress.questionsTotal > 0 && progress.questionsPlayed >= progress.questionsTotal;
};

const tableHintOf = (state: GameState): string => {
  if (state.table && isRemovingFinalThemes(state.table)) {
    return FINAL_REMOVE_HINT;
  }
  if (state.table?.type === RoundType.FINAL) {
    return FINAL_OPEN_HINT;
  }
  return TABLE_HINT;
};

const answeringOf = (state: GameState): PlayerView | null => {
  if (state.screen !== Screen.Question) {
    return null;
  }
  return state.players.find(player => player.queue === 0) ?? null;
};

type IdleStatus = { full: string; short: string };

const idleStatusOf = (state: GameState): IdleStatus => {
  if (state.questionPage?.currentPage?.isMarker || (state.questionPage && state.questionPage.pageIndex > 0 && !state.questionPage.nextPage)) {
    return ANSWER_SHOWN;
  }
  if (state.question && state.question.type !== QuestionType.DEFAULT) {
    return PICK_PLAYER;
  }
  return NOBODY;
};

const nextActionOf = (screen: Screen | null, step: NextStep, isLastRound: boolean, tableHint: string, roundPlayed: boolean): NextAction => {
  switch (screen) {
    case Screen.Table:
      return { kind: "hint", label: tableHint };
    case Screen.ThemeListInRound:
      return { kind: "button", label: roundPlayed ? RESULTS_LABEL : "К табло", enabled: true };
    case Screen.Question:
      return { kind: "button", label: QUESTION_LABELS[step], enabled: true };
    case Screen.Results:
      return isLastRound
        ? { kind: "button", label: "Игра окончена", enabled: false }
        : { kind: "button", label: "Следующий раунд", enabled: true };
    default: {
      const label = screen ? SCREEN_LABELS[screen] : undefined;
      return label ? { kind: "button", label, enabled: true } : { kind: "button", label: "Далее", enabled: false };
    }
  }
};

const splitLastWord = (label: string): [string, string] => {
  const index = label.lastIndexOf(" ");
  return index < 0 ? ["", label] : [label.slice(0, index + 1), label.slice(index + 1)];
};

const Judges: FC<{ player: PlayerView | null; idleStatus: IdleStatus }> = ({ player, idleStatus }) => {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const cooldown = useCooldown(JUDGE_COOLDOWN_MS);
  const playerId = player?.id ?? null;
  const name = player ? player.name || "Без имени" : "";

  const judge = useCallback(async (win: boolean) => {
    if (!playerId || busyRef.current || cooldown.isCooling()) {
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      await (win ? client.winPlayer(playerId) : client.losePlayer(playerId));
    } catch (error) {
      notifyError(error, "Не удалось засчитать ответ");
    } finally {
      cooldown.start();
      busyRef.current = false;
      setBusy(false);
    }
  }, [playerId, cooldown]);
  const onLose = useCallback(() => judge(false), [judge]);
  const onWin = useCallback(() => judge(true), [judge]);

  return (
    <>
      <div className="flex w-[5.25rem] shrink-0 flex-col justify-center px-1 sm:w-44 lg:w-40 xl:w-80 2xl:w-96" aria-live="polite">
        {player
          ? (<>
            <span className="text-xs leading-4 text-blue-200">Отвечает</span>
            <span className={`truncate text-base font-bold leading-6 ${name.length > LONG_NAME ? "" : "sm:text-lg"}`} title={name}>{name}</span>
          </>)
          : (<>
            <span className="text-sm leading-4 text-blue-200 sm:hidden">{idleStatus.short}</span>
            <span className="hidden text-sm leading-4 text-blue-200 sm:inline">{idleStatus.full}</span>
          </>)}
      </div>
      <button
        type="button"
        disabled={!player || busy || cooldown.cooling}
        aria-label={player ? `Неверно: ${name}` : "Неверно"}
        title="Неверно"
        onClick={onLose}
        className={`${JUDGE_BUTTON} bg-[#ff4d4f] hover:bg-[#ff7875] active:bg-[#d9363e]`}
      >
        <CloseOutlined />
      </button>
      <button
        type="button"
        disabled={!player || busy || cooldown.cooling}
        aria-label={player ? `Верно: ${name}` : "Верно"}
        title="Верно"
        onClick={onWin}
        className={`${JUDGE_BUTTON} bg-green-600 hover:bg-green-500 active:bg-green-700`}
      >
        <CheckOutlined />
      </button>
    </>
  );
};

const NextLabel: FC<{ label: string; icon: ReactNode; showKey: boolean }> = ({ label, icon, showKey }) => {
  const [head, tail] = splitLastWord(label);
  return (
    <FitText min={12} className="text-lg font-bold lg:text-xl">
      {head}
      <span className="whitespace-nowrap">
        {tail}
        {icon}
      </span>
      {showKey && (
        <kbd aria-hidden="true" className="ml-2 hidden whitespace-nowrap rounded bg-white/20 px-1.5 py-0.5 align-middle font-sans text-[11px] font-semibold leading-4 [@media(hover:hover)_and_(pointer:fine)]:inline-block">
          PageDown
        </kbd>
      )}
    </FitText>
  );
};

export const HostActions: FC<{ className?: string }> = ({ className }) => {
  const screen = useGameStore(state => state.screen);
  const step = useGameStore(nextStepOf);
  const isLastRound = useGameStore(state => state.isLastRound);
  const answering = useGameStore(answeringOf);
  const idleStatus = useGameStore(idleStatusOf);
  const tableHint = useGameStore(tableHintOf);
  const roundPlayed = useGameStore(roundPlayedOf);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  const action = nextActionOf(screen, step, isLastRound, tableHint, roundPlayed);
  const enabled = action.kind === "button" && action.enabled;

  const onNext = useCallback(async () => {
    if (pendingRef.current) {
      return;
    }
    pendingRef.current = true;
    setPending(true);
    try {
      await client.next();
    } catch (error) {
      notifyError(error, "Не удалось перейти дальше");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, []);

  useNextKey(enabled, onNext);

  const icon = pending
    ? <LoadingOutlined className="ml-2 text-[0.9em]" />
    : <ArrowRightOutlined className="ml-2 text-[0.9em]" />;

  return (
    <div className={`shrink-0 px-2 pb-2 sm:px-3 sm:pb-3 ${EDGE_TO_EDGE.has(screen) ? "pt-2 sm:pt-3" : ""} ${className ?? ""}`}>
      <div
        role="group"
        aria-label="Действия ведущего"
        className="flex items-stretch gap-2 rounded-xl bg-blue-950/50 p-1.5 sm:p-2"
        {...noBuzzer}
      >
        {screen === Screen.Question && <Judges player={answering} idleStatus={idleStatus} />}
        {action.kind === "hint"
          ? (
            <div role="status" className="flex h-14 min-w-0 flex-1 items-center rounded-xl border border-dashed border-blue-300/50 px-3 text-blue-200">
              <FitText min={12} className="text-base font-semibold lg:text-lg">{action.label}</FitText>
            </div>
          )
          : (
            <button
              type="button"
              disabled={!action.enabled}
              aria-busy={pending || undefined}
              aria-keyshortcuts={action.enabled ? NEXT_KEY : undefined}
              title={action.enabled ? `${action.label} (${NEXT_KEY})` : action.label}
              onClick={onNext}
              className={`flex h-14 min-w-0 flex-1 items-center rounded-xl bg-blue-600 px-3 text-white shadow-[0_8px_18px_-8px_rgba(37,99,235,0.9)] transition-colors hover:bg-blue-500 active:bg-blue-700 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-blue-200 disabled:shadow-none ${pending ? "cursor-wait" : ""} ${FOCUS_RING}`}
            >
              <NextLabel label={action.label} icon={action.enabled ? icon : null} showKey={action.enabled} />
            </button>
          )}
      </div>
    </div>
  );
};
