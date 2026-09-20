import { CSSProperties, FC, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PayloadStartTable } from "@/types";
import { client } from "@/client";
import { RoundType } from "@/data";
import { notifyError } from "@/utils/notify";
import { FitText, useUniformFit } from "@/components/FitText";
import { formatPageText } from "@/utils/utils";

type TableQuestion = PayloadStartTable['themes'][0]['questions'][0]

type QuestionTableProps = {
  className?: string
  fontSize?: string
  data: PayloadStartTable
  animateSelectQuestion: string | null
}

const PRICE_CELL = '[data-price-cell]'
const CELL = 'min-w-0 min-h-0 border-r border-b border-slate-300'

const themeColumnShare = (maxColumns: number, longestName: number): number => {
  const byColumns = 0.4 - 0.009 * maxColumns
  const byName = 0.14 + 0.006 * longestName
  return Math.max(0.16, Math.min(byColumns, byName))
}

const hasQuestion = (question?: TableQuestion): boolean => !!question && question.isAvailable

export const QuestionTable: FC<QuestionTableProps> = memo(function QuestionTable({ className, fontSize = '2rem', data, animateSelectQuestion }) {
  const gridRef = useRef<HTMLDivElement>(null)
  useUniformFit(gridRef, PRICE_CELL)

  const maxColumns = useMemo(
    () => data.themes.reduce((max, theme) => Math.max(max, theme.questions.length), 0),
    [data.themes]
  );
  const longestName = useMemo(
    () => data.themes.reduce((max, theme) => Math.max(max, theme.name.length), 0),
    [data.themes]
  );
  const [lastAnimateSelectQuestion, setLastAnimateSelectQuestion] = useState<string | null>(null)
  useEffect(() => {
    if (lastAnimateSelectQuestion === animateSelectQuestion) {
      return
    }

    if (animateSelectQuestion) {
      setLastAnimateSelectQuestion(animateSelectQuestion)
      const target = document.getElementById('question_' + animateSelectQuestion)
      if (target) {
        target.classList.toggle("animate-selectQuestion")
        setTimeout(() => {
          target.classList.toggle("animate-selectQuestion")
        }, 1000)
      }

    }
  }, [animateSelectQuestion, lastAnimateSelectQuestion])

  const handleSelectQuestion = useCallback((questionId: string) => async () => {
    try {
      await client.selectQuestion(questionId)
    } catch (error) {
      notifyError(error, 'Не удалось выбрать вопрос')
    }
  }, []);

  const isFinal = data.type !== RoundType.DEFAULT
  const finalThemes = isFinal ? data.themes.filter(theme => theme.questions[0]) : []
  const rowsCount = Math.max(1, isFinal ? finalThemes.length : data.themes.length)
  const share = themeColumnShare(maxColumns, longestName)
  const gridStyle: CSSProperties = {
    fontSize,
    gridTemplateRows: `repeat(${rowsCount}, minmax(0, 1fr))`,
    gridTemplateColumns: isFinal
      ? 'minmax(0, 1fr)'
      : `minmax(0, ${(share * 100).toFixed(2)}%) repeat(${Math.max(1, maxColumns)}, minmax(0, 1fr))`,
  }

  return (
    <div className={`h-full w-full bg-blue-700 ${className ?? ''}`}>
      <div ref={gridRef} className="grid h-full w-full border-t border-l border-slate-300 text-white" style={gridStyle}>
        {!isFinal && data.themes.map((theme, themeIndex) => (
          <div key={themeIndex} className="contents">
            <div className={`${CELL} px-[0.8vmin] text-[0.6em]`}>
              <FitText align="left">{formatPageText(theme.name)}</FitText>
            </div>
            {[...Array(maxColumns)].map((_, questionIndex) => {
              const question = theme.questions[questionIndex];
              if (!question) {
                return <div key={`empty_${questionIndex}`} className={CELL} />;
              }
              const available = hasQuestion(question)
              return (
                <div
                  key={question.id}
                  id={'question_' + question.id}
                  data-price-cell=""
                  className={`${CELL} flex overflow-hidden whitespace-nowrap px-[0.14em] ${available ? "cursor-pointer hover:bg-gray-300" : ""}`}
                  onClick={available ? handleSelectQuestion(question.id) : undefined}
                >
                  <span className={`m-auto leading-tight ${available ? "" : "invisible"}`}>{question.price}</span>
                </div>
              );
            })}
          </div>
        ))}
        {isFinal && finalThemes.map(theme => {
          const question = theme.questions[0]
          const available = hasQuestion(question)
          return (
            <div
              key={question.id}
              id={'question_' + question.id}
              className={`${CELL} px-[2vmin] text-[0.62em] ${available ? "cursor-pointer hover:bg-gray-300" : ""}`}
              onClick={available ? handleSelectQuestion(question.id) : undefined}
            >
              <FitText className={available ? "" : "text-white/40 line-through decoration-white/60"}>{formatPageText(theme.name)}</FitText>
            </div>
          );
        })}
      </div>
    </div>
  );
});
