import React, { useCallback, useRef, useState } from "react";
import { Button } from "antd";
import { DislikeOutlined, LikeOutlined, AimOutlined } from "@ant-design/icons";
import { client } from "@/client";
import { InputNumber } from "../override/InputNumber";
import { FitText } from "../FitText";
import { useGameStore, type PlayerView } from "@/store/game";
import { QuestionType, Screen } from "@/data";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useElementWidth } from "@/hooks/useElementWidth";
import { notifyError } from "@/utils/notify";

const WIDE_FROM = 560;
const WIDE_COLUMNS = "2.5rem minmax(0,1fr) 2.5rem 2.5rem 6.5rem 4.75rem 4.75rem";
const COMPACT_COLUMNS = "2.5rem minmax(0,1fr) 2.5rem 2.5rem 5.75rem";

type RowMark = "selector" | "first" | "queued" | "idle"

const rowMark = (player: PlayerView, showSelector: boolean): RowMark => {
  if (player.queue !== null) {
    return player.queue === 0 ? "first" : "queued"
  }
  return showSelector && player.isCurrent ? "selector" : "idle"
}

const ROW_HIGHLIGHT: Record<RowMark, string> = {
  selector: "bg-orange-50",
  first: "bg-green-50",
  queued: "",
  idle: "",
}

const run = async (errorTitle: string, request: () => Promise<void>) => {
  try {
    await request()
  } catch (error) {
    notifyError(error, errorTitle)
  }
}

const NumberCell: React.FC<{ value: number, label: string, onCommit: (value: number) => Promise<void> }> = ({ value, label, onCommit }) => {
  const commit = useDebouncedCallback(onCommit, 150)
  const onChange = useCallback((next: number | string | null) => {
    if (typeof next === 'number' && Number.isFinite(next)) {
      commit(next)
    }
  }, [commit])
  return (
    <InputNumber
      className="!w-full"
      aria-label={label}
      value={value}
      onChange={onChange}
    />
  )
}

const QueueMark: React.FC<{ player: PlayerView, mark: RowMark, onSelect: () => void }> = ({ player, mark, onSelect }) => {
  if (mark === "selector") {
    return (
      <Button
        type="primary"
        shape="circle"
        size="large"
        aria-label={`${player.name}: выбирает вопрос`}
        title="Выбирает вопрос"
        onClick={onSelect}
        className="!bg-orange-500"
        icon={<AimOutlined className="text-xl" />}
      />
    )
  }
  if ((mark === "first" || mark === "queued") && player.queue !== null) {
    return (
      <span
        role="img"
        aria-label={`${player.name}: место в очереди ${player.queue + 1}`}
        title={`Место в очереди: ${player.queue + 1}`}
        className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white ${mark === "first" ? 'bg-green-600' : 'bg-sky-700'}`}
      >
        {player.queue + 1}
      </span>
    )
  }
  return (
    <Button
      shape="circle"
      size="large"
      aria-label={`${player.name}: передать выбор вопроса`}
      title="Передать выбор вопроса"
      onClick={onSelect}
      icon={<AimOutlined className="text-xl" />}
    />
  )
}

const PlayerRow: React.FC<{ player: PlayerView, columns: string, wide: boolean, showCounters: boolean, showSelector: boolean }> = ({ player, columns, wide, showCounters, showSelector }) => {
  const onSelect = useCallback(() => {
    void run('Не удалось выбрать игрока', () => client.selectPlayer(player.id))
  }, [player.id])
  const onWin = useCallback(() => {
    void run('Не удалось засчитать ответ', () => client.winPlayer(player.id))
  }, [player.id])
  const onLose = useCallback(() => {
    void run('Не удалось засчитать ответ', () => client.losePlayer(player.id))
  }, [player.id])
  const onScore = useCallback((value: number) =>
    run('Не удалось изменить очки', () => client.setScorePlayer(player.id, value)), [player.id])
  const onWinCount = useCallback((value: number) =>
    run('Не удалось изменить число правильных ответов', () => client.setWinPlayer(player.id, value)), [player.id])
  const onLoseCount = useCallback((value: number) =>
    run('Не удалось изменить число неверных ответов', () => client.setLosePlayer(player.id, value)), [player.id])

  const mark = rowMark(player, showSelector)

  return (
    <div role="row" className={`grid items-center gap-x-1.5 gap-y-1.5 rounded-lg px-1 py-1.5 ${ROW_HIGHLIGHT[mark]}`} style={{ gridTemplateColumns: columns }}>
      <div role="cell" className="flex justify-center">
        <QueueMark player={player} mark={mark} onSelect={onSelect} />
      </div>
      <div role="cell" className="h-10 min-w-0">
        <FitText align="left" max={17} min={11} className="font-semibold text-slate-900">{player.name || "Без имени"}</FitText>
      </div>
      <div role="cell">
        <Button
          type="primary"
          shape="circle"
          size="large"
          aria-label={`Верно: ${player.name}`}
          title="Верно"
          onClick={onWin}
          className="!bg-green-600 hover:!bg-green-500"
          icon={<LikeOutlined />}
        />
      </div>
      <div role="cell">
        <Button
          type="primary"
          danger
          shape="circle"
          size="large"
          aria-label={`Неверно: ${player.name}`}
          title="Неверно"
          onClick={onLose}
          icon={<DislikeOutlined />}
        />
      </div>
      <div role="cell">
        <NumberCell value={player.score} label={`Очки: ${player.name}`} onCommit={onScore} />
      </div>
      {wide && (<>
        <div role="cell">
          <NumberCell value={player.win} label={`Верных ответов: ${player.name}`} onCommit={onWinCount} />
        </div>
        <div role="cell">
          <NumberCell value={player.lose} label={`Неверных ответов: ${player.name}`} onCommit={onLoseCount} />
        </div>
      </>)}
      {!wide && showCounters && (
        <div role="cell" className="col-span-full grid grid-cols-2 gap-2 pl-12">
          <label className="flex min-w-0 items-center gap-1.5 text-xs text-slate-600">
            <span className="shrink-0">Верных</span>
            <NumberCell value={player.win} label={`Верных ответов: ${player.name}`} onCommit={onWinCount} />
          </label>
          <label className="flex min-w-0 items-center gap-1.5 text-xs text-slate-600">
            <span className="shrink-0">Неверных</span>
            <NumberCell value={player.lose} label={`Неверных ответов: ${player.name}`} onCommit={onLoseCount} />
          </label>
        </div>
      )}
    </div>
  )
}

export const PlayerTable: React.FC<{ players: PlayerView[], className?: string }> = ({ players, className }) => {
  const ref = useRef<HTMLElement>(null)
  const width = useElementWidth(ref)
  const wide = width >= WIDE_FROM
  const [showCounters, setShowCounters] = useState(false)
  const toggleCounters = useCallback(() => setShowCounters(value => !value), [])
  const columns = wide ? WIDE_COLUMNS : COMPACT_COLUMNS
  const showSelector = useGameStore(state => state.screen !== Screen.Question || (!!state.question && state.question.type !== QuestionType.DEFAULT))

  return (
    <section ref={ref} aria-label="Игроки" className={`rounded-xl bg-white shadow-sm ${className ?? ""}`}>
      <div className="flex min-h-10 items-center justify-between gap-2 px-3 pt-2">
        <h2 className="m-0 text-sm font-bold uppercase tracking-wide text-slate-500">Игроки</h2>
        {!wide && players.length > 0 && (
          <Button type={showCounters ? "primary" : "default"} aria-pressed={showCounters} className="!h-10 !px-3" onClick={toggleCounters}>
            Верно / неверно
          </Button>
        )}
      </div>
      {players.length === 0
        ? <div className="px-3 pb-3 text-sm text-slate-500">Игроков нет: добавьте их в меню → «Настройка игроков»</div>
        : (
          <div role="table" aria-label="Игроки" className="px-2 pb-2">
            <div role="row" className="grid items-end gap-x-1.5 border-b border-slate-200 px-1 pb-1 text-xs font-semibold text-slate-500" style={{ gridTemplateColumns: columns }}>
              <span role="columnheader" aria-label="Очередь" />
              <span role="columnheader">Имя</span>
              <span role="columnheader" aria-label="Верно" />
              <span role="columnheader" aria-label="Неверно" />
              <span role="columnheader" className="pl-1">Очки</span>
              {wide && <span role="columnheader" className="pl-1">Верных</span>}
              {wide && <span role="columnheader" className="pl-1">Неверных</span>}
            </div>
            {players.map(player => (
              <PlayerRow key={player.id} player={player} columns={columns} wide={wide} showCounters={showCounters} showSelector={showSelector} />
            ))}
          </div>
        )}
    </section>
  );
};
