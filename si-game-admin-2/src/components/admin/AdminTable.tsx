import { CSSProperties, FC, Fragment, useCallback, useMemo, useRef } from "react";
import { PayloadStartTable } from "@/types";
import { client } from "@/client";
import { RoundType } from "@/data";
import { notifyError } from "@/utils/notify";
import { FitText, useUniformFit } from "../FitText";

const PRICE_CELL = "[data-admin-price]";

const themeShare = (columns: number, longestName: number): number =>
  Math.max(0.2, Math.min(0.36 - 0.01 * columns, 0.14 + 0.006 * longestName));

const themeMinWidth = (longestName: number): string =>
  longestName <= 20 ? "[--theme-min:7.5rem]" : longestName <= 45 ? "[--theme-min:8.5rem]" : "[--theme-min:10rem]";

const useSelectQuestion = () => useCallback((questionId: string) => async () => {
  try {
    await client.selectQuestion(questionId)
  } catch (error) {
    notifyError(error, 'Не удалось выбрать вопрос')
  }
}, [])

const FinalThemes: FC<{ data: PayloadStartTable }> = ({ data }) => {
  const select = useSelectQuestion()
  const themes = data.themes.filter(theme => theme.questions[0])
  const style = { "--final-rows": Math.max(1, Math.ceil(themes.length / 2)) } as CSSProperties
  return (
    <div className="h-full min-h-0 overflow-y-auto p-2 sm:p-3">
      <div className="mb-2 text-sm text-blue-100">Нажмите на тему, чтобы убрать её</div>
      <div
        className="grid auto-rows-[3.25rem] grid-cols-1 gap-1.5 sm:grid-cols-2 lg:h-[calc(100%-1.75rem)] lg:[grid-template-rows:repeat(var(--final-rows),minmax(3rem,1fr))]"
        style={style}
      >
        {themes.map(theme => {
          const question = theme.questions[0]
          return (
            <button
              key={question.id}
              type="button"
              disabled={!question.isAvailable}
              onClick={question.isAvailable ? select(question.id) : undefined}
              className={`min-w-0 rounded-lg px-3 py-1 text-left text-white ${question.isAvailable ? "bg-blue-950/40 hover:bg-blue-600 active:bg-blue-500" : "cursor-default bg-blue-950/20 line-through opacity-50"}`}
            >
              <FitText align="left" min={11} className="text-base font-semibold lg:text-2xl">{theme.name}</FitText>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const AdminTable: FC<{ data: PayloadStartTable }> = ({ data }) => {
  const gridRef = useRef<HTMLDivElement>(null)
  const select = useSelectQuestion()
  useUniformFit(gridRef, PRICE_CELL, 11)

  const columns = useMemo(
    () => Math.max(1, data.themes.reduce((max, theme) => Math.max(max, theme.questions.length), 0)),
    [data.themes]
  )
  const longestName = useMemo(
    () => data.themes.reduce((max, theme) => Math.max(max, theme.name.length), 0),
    [data.themes]
  )

  if (data.type !== RoundType.DEFAULT) {
    return <FinalThemes data={data} />
  }

  const share = themeShare(columns, longestName)
  const themeFr = (columns * share / (1 - share)).toFixed(2)
  const style = {
    "--table-rows": Math.max(1, data.themes.length),
    gridTemplateColumns: `minmax(var(--theme-min), ${themeFr}fr) repeat(${columns}, minmax(var(--price-min), 1fr))`,
    minWidth: `calc(var(--theme-min) + ${columns} * var(--price-min))`,
  } as CSSProperties

  return (
    <div className="h-full min-h-0 overflow-auto overscroll-x-contain">
      <div
        ref={gridRef}
        className={`grid w-full text-lg font-bold text-white ${themeMinWidth(longestName)} [--price-min:2.75rem] [grid-template-rows:repeat(var(--table-rows),minmax(3.25rem,auto))] lg:h-full lg:text-3xl lg:[--price-min:2.25rem] lg:[--theme-min:6rem] lg:[grid-template-rows:repeat(var(--table-rows),minmax(2.75rem,1fr))]`}
        style={style}
      >
        {data.themes.map((theme, themeIndex) => (
          <Fragment key={themeIndex}>
            <div className="sticky left-0 z-10 min-w-0 border-b border-r border-blue-400/60 bg-blue-900 px-2 py-0.5 shadow-[2px_0_4px_rgba(0,0,0,0.25)]">
              <FitText align="left" min={11} className="text-sm font-semibold lg:text-xl">{theme.name}</FitText>
            </div>
            {Array.from({ length: columns }, (_, questionIndex) => {
              const question = theme.questions[questionIndex]
              if (!question || !question.isAvailable) {
                return <div key={question?.id ?? `empty_${questionIndex}`} className="min-w-0 border-b border-r border-blue-400/60" />
              }
              return (
                <button
                  key={question.id}
                  type="button"
                  data-admin-price=""
                  aria-label={`${theme.name}: ${question.price}`}
                  onClick={select(question.id)}
                  className="min-w-0 overflow-hidden whitespace-nowrap border-b border-r border-blue-400/60 px-0.5 text-yellow-200 hover:bg-blue-600 active:bg-blue-500"
                >
                  {question.price}
                </button>
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
