import { FC, ReactNode } from "react";
import { StopOutlined } from "@ant-design/icons";
import { costToString, getLocalizedQuestionType } from "@/utils/utils";
import { QuestionAnswerType, QuestionType, SelectionModeType } from "@/data";
import { PageSnapshotType, PayloadQuestionPage, PayloadStartQuestion } from "@/types";
import { AdminPage } from "./AdminPage";
import { HostReplic, hasReplic } from "./HostReplic";
import { FitText } from "../FitText";
import { useGameStore } from "@/store/game";
import { mediaUrl } from "@/utils/api";
import { formatPageText } from "@/utils/utils";

const PANEL_LABEL = "shrink-0 text-[11px] font-bold uppercase leading-4 tracking-wider";

const pageBodyHeight = (length: number, visual: boolean): string => {
  if (length > 900) {
    return "h-[30rem] sm:h-[32rem]"
  }
  if (length > 400) {
    return "h-80 sm:h-96"
  }
  if (visual) {
    return "h-60 sm:h-72"
  }
  return length > 150 ? "h-60 sm:h-72 md:h-80" : "h-44 sm:h-64 md:h-72"
}

const answerBoxHeight = (length: number): string =>
  length > 400 ? "h-64" : length > 150 ? "h-40" : length > 60 ? "h-28" : "h-24 sm:h-28";

const replicHeight = (page: PageSnapshotType, compact?: boolean): string => {
  const length = formatPageText(page.replic).trim().length
  if (compact) {
    return length > 120 ? "h-20" : "h-14"
  }
  return length > 500 ? "h-48 lg:h-[34%]" : length > 200 ? "h-32 lg:h-[28%]" : "h-20 lg:h-[24%]"
}

const answerText = (question: PayloadStartQuestion): string =>
  (question.rightAnswer ?? []).map(answer => answer.trim()).filter(Boolean).join("\n");

const hasOptions = (question: PayloadStartQuestion): boolean =>
  question.answerType === QuestionAnswerType.Group && question.answerGroup.length > 0;

const Chip: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <span className="inline-flex max-w-full items-baseline gap-1 rounded-md bg-blue-950/50 px-2 py-0.5 text-sm leading-5">
    <span className="shrink-0 text-blue-200">{label}:</span>
    <span className="min-w-0 break-words font-semibold">{children}</span>
  </span>
);

const QuestionInfo: FC<{ question: PayloadStartQuestion }> = ({ question }) => (
  <div className="flex shrink-0 flex-wrap gap-1.5">
    {question.themeName && <Chip label="Тема">{question.themeName}</Chip>}
    <Chip label="Цена">{(question.selectPrice && costToString(question.selectPrice)) || question.price}</Chip>
    {question.type && <Chip label="Тип">{getLocalizedQuestionType(question.type)}</Chip>}
    {question.type !== QuestionType.DEFAULT && (
      <Chip label="Себе">{question.selectionMode === SelectionModeType.ANY ? "Можно" : "Нельзя"}</Chip>
    )}
  </div>
);

const AnswerOptions: FC<{ question: PayloadStartQuestion }> = ({ question }) => {
  const gameId = useGameStore(state => state.gameId)
  const right = new Set((question.rightAnswer ?? []).map(answer => answer.trim().toLowerCase()))
  return (
    <ul aria-label="Варианты ответа" className="m-0 grid shrink-0 list-none auto-rows-min grid-cols-1 gap-1 p-0 text-sm sm:grid-cols-2 lg:max-h-[55%] lg:min-h-0 lg:shrink lg:overflow-y-auto lg:text-base">
      {question.answerGroup.map(option => {
        const isRight = right.has(option.variant.trim().toLowerCase())
        return (
          <li
            key={option.variant}
            aria-label={isRight ? `${option.variant}: правильный вариант` : undefined}
            className={`flex min-w-0 items-center gap-2 rounded-md px-2 py-1 ${isRight ? "bg-green-600 ring-2 ring-green-300" : "bg-blue-950/50"}`}
          >
            <span className="shrink-0 font-bold text-yellow-200">{option.variant}</span>
            {typeof option.answer !== "object"
              ? <span className="min-w-0 break-words">{option.answer}</span>
              : (
                <picture className="block h-12 min-w-0 flex-1 lg:h-16">
                  <img src={mediaUrl(gameId, "Images", option.answer["#text"])} alt={option.variant} className="block h-full w-full object-contain" />
                </picture>
              )}
          </li>
        )
      })}
    </ul>
  )
}

const AnswerPanel: FC<{ question: PayloadStartQuestion; className?: string }> = ({ question, className }) => {
  const answer = answerText(question)
  const comments = question.comments?.trim()
  return (
    <section aria-label="Ответ" className={`flex min-w-0 flex-col gap-1 rounded-lg bg-amber-50 p-2 text-slate-900 lg:min-h-0 ${className ?? ""}`}>
      <div className={`${PANEL_LABEL} text-amber-700`}>Правильный ответ</div>
      <div className={`${answerBoxHeight(answer.length)} min-h-0 shrink-0 lg:h-auto lg:min-h-[2.5rem] lg:shrink lg:flex-[3]`}>
        {answer
          ? <FitText align="left" min={12} className="text-xl font-bold lg:text-4xl">{answer}</FitText>
          : <div className="text-sm text-slate-500">Ответ в паке не указан</div>}
      </div>
      {comments && (<>
        <div className={`${PANEL_LABEL} text-amber-700`}>Комментарий</div>
        <div className={`${comments.length > 200 ? "h-28" : "h-16"} min-h-0 shrink-0 lg:h-auto lg:min-h-[2rem] lg:shrink lg:flex-[2]`}>
          <FitText align="left" min={11} className="text-sm lg:text-lg">{comments}</FitText>
        </div>
      </>)}
    </section>
  )
}

const CurrentPanel: FC<{ question: PayloadStartQuestion; pageData: PayloadQuestionPage; isPreparation: boolean; className?: string }> = ({ question, pageData, isPreparation, className }) => {
  const questionRun = useGameStore(state => state.questionRun)
  const page = isPreparation ? null : pageData.currentPage
  const isAnswer = !!page?.isMarker
  const hasVisual = !!page && (!!page.image || !!page.video || !!page.html || !!page.htmlFile)
  const textLength = page ? formatPageText(page.text).trim().length * (hasVisual ? 2 : 1) : 0
  return (
    <section
      aria-label="На экране"
      className={`flex min-w-0 flex-col gap-1.5 rounded-lg bg-blue-900 p-2 ${isAnswer ? "ring-4 ring-inset ring-yellow-300" : ""} ${className ?? ""}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <span className={`${PANEL_LABEL} text-blue-200`}>На экране{isAnswer ? " · ответ" : ""}</span>
        {!isPreparation && pageData.pagesCount > 0 && (
          <span className="text-xs tabular-nums text-blue-200">стр. {pageData.pageIndex + 1}/{pageData.pagesCount}</span>
        )}
      </div>
      <div className={`${pageBodyHeight(textLength, hasVisual)} min-h-0 lg:h-auto lg:flex-1`}>
        {isPreparation
          ? <FitText className="text-4xl font-bold uppercase text-yellow-200 lg:text-6xl">{getLocalizedQuestionType(question.type)}</FitText>
          : page
            ? <AdminPage key={`${questionRun}-${pageData.pageIndex}`} page={page} />
            : <div className="flex h-full items-center justify-center text-sm text-blue-200">Нет страницы</div>}
      </div>
      {!isPreparation && hasOptions(question) && <AnswerOptions question={question} />}
      {page && hasReplic(page) && <HostReplic page={page} className={`${replicHeight(page)} lg:min-h-[4.5rem]`} />}
    </section>
  )
}

const NextPanel: FC<{ page: PayloadQuestionPage["nextPage"]; className?: string }> = ({ page, className }) => (
  <section aria-label="Следующая страница" className={`flex min-w-0 flex-col gap-1.5 rounded-lg bg-slate-800 p-2 lg:min-h-0 ${page?.isMarker ? "ring-2 ring-inset ring-yellow-300" : ""} ${className ?? ""}`}>
    <div className={`${PANEL_LABEL} text-slate-300`}>{page ? (page.isMarker ? "Далее: ответ" : "Далее") : "Далее"}</div>
    <div className="h-24 min-h-0 sm:h-28 lg:h-auto lg:flex-1">
      {page
        ? <AdminPage page={page} isPreview />
        : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-200">
            <StopOutlined className="text-3xl" />
            <div>Конец вопроса</div>
          </div>
        )}
    </div>
    {page && hasReplic(page) && <HostReplic page={page} compact className={replicHeight(page, true)} />}
  </section>
)

export const QuestionAdmin: FC<{ question: PayloadStartQuestion, pageData: PayloadQuestionPage, isPreparation: boolean }> = ({ question, pageData, isPreparation }) => {
  const wideAnswer = answerText(question).length > 60 || (question.comments?.trim().length ?? 0) > 200
  const span = wideAnswer ? "col-span-2 md:col-span-1" : ""
  return (
    <div className="flex flex-col gap-2 p-2 sm:p-3 lg:h-full lg:min-h-0">
      <QuestionInfo question={question} />
      <div className="grid grid-cols-2 gap-2 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
        <CurrentPanel question={question} pageData={pageData} isPreparation={isPreparation} className="col-span-2 lg:col-span-1 lg:row-span-2" />
        <AnswerPanel question={question} className={span} />
        <NextPanel page={pageData.nextPage} className={span} />
      </div>
    </div>
  );
};
