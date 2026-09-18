import { FC, memo, useCallback, useEffect, useMemo, useState } from "react";

import { PayloadStartTable } from "@/types";
import { client } from "@/client";
import { RoundType } from "@/data";
import { notifyError } from "@/utils/notify";
// eslint-disable-next-line react/display-name
export const QuestionTable: FC<{ className?: string, data: PayloadStartTable, animateSelectQuestion: string | null }> = memo(({ className, data, animateSelectQuestion }) => {
  // a round may have no themes / questions at all
  const maxColumns = useMemo(
    () => data.themes.reduce((max, theme) => Math.max(max, theme.questions.length), 0),
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

  return (
    <div className={`h-full bg-blue-700 shadow-[0_0_400px_230px_rgba(0,0,0,0.40)_inset] border-solid border-2 border-blue-800 border-b-gray-700 overflow-x-auto ${className}`}>
      <table className="text-white w-full h-full table-auto border-collapse border-spacing-2 border border-slate-500 mx-auto">
        <tbody>
          {data.type === RoundType.DEFAULT
            ? data.themes.map((theme, themeIndex) => {
              return (
                <tr key={themeIndex}>
                  <td className="text-white border-slate-300 min-w-[150px] max-w-[250px] border pl-4">
                    {theme.name}
                  </td>
                  {[...Array(maxColumns)].map((_, questionIndex) => {
                    const question = theme.questions[questionIndex];
                    if (question) {
                      return (
                        <td
                          key={question.id}
                          id={'question_' + question.id}
                          className={`!min-w-20 text-white text-center border border-slate-300 ${hasQuestion(question) ? "hover:bg-gray-300" : ""
                            }`}
                          onClick={hasQuestion(question) ? handleSelectQuestion(question.id) : undefined}
                        >
                          {hasQuestion(question) ? question.price : ""}
                        </td>
                      );
                    }
                    return <td key={`empty_${questionIndex}`} className="!min-w-20 border border-slate-300" />;
                  })}
                </tr>
              );
            })
            : data.themes.map((theme, themeIndex) => {
              const question = theme.questions[0];
              if (!question) {
                return null;
              }
              return (
                <tr key={themeIndex}>
                  <td
                    key={question.id}
                    id={'question_' + question.id}
                    className={`!min-w-20 text-white text-center border border-slate-300 ${hasQuestion(question) ? "hover:bg-gray-300" : ""
                      }`}
                    onClick={hasQuestion(question) ? handleSelectQuestion(question.id) : undefined}
                  >
                    {hasQuestion(question) ? theme.name : ""}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
});

const hasQuestion = (question?: PayloadStartTable['themes'][0]['questions'][0]) => {
  if (question && question.isAvailable) {
    return true
  }

  return false;
};
