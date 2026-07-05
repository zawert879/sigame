import * as Data from "@/data";
import { timeout } from "@/utils/utils";
import { FC, useEffect, useRef, useState } from "react";
// import { Question } from "../../../question";
import { QuestionType } from "./QuestionType";
import { PlayerPanel } from "../PlayerPanel";
import { PayloadQuestionPage, PayloadStartQuestion } from "@/types";
import { Page } from "./Page";
import { QuestionAnswerType } from "@/data";
import { getGameIdFromPath } from "@/utils/route";
// import useGameStore from "@/store/game";

export const QuestionPlayer: FC<{ question: PayloadStartQuestion, pageData: PayloadQuestionPage }> = ({ pageData, question }) => {
  const div = useRef<HTMLDivElement>(null);
  const gameId = getGameIdFromPath()
  return (
    <div className="w-screen h-screen">
      <div
        ref={div}
        className={`bg-blue-700 h-[90vh] w-full p-8 text-center text-white flex justify-center items-center shadow-[0_0_400px_230px_rgba(0,0,0,0.40)_inset]`}
        style={{
          fontSize: 'calc(1em + 4vw)'
        }}
      >
        {
          pageData.currentPage && (<>
            <Page page={pageData.currentPage} isAdmin />
            {question.answerType === QuestionAnswerType.Group && question.answerGroup.length > 0 && (
              <div className="py-4 w-1/4 border-l-white border-l-2 ml-4 flex flex-col justify-around items-center">
                {question.answerGroup.map((ag, index) => {
                  return (
                    <div key={ag.variant} className="flex items-center">
                      {ag.variant}: {typeof ag.answer !== 'object' ? ag.answer : (<picture
                        key="image"
                        className=""
                      >
                        <img
                          src={
                            /^https?:\/\//.test(ag.answer["#text"])
                              ? ag.answer["#text"]
                              : `/api/files/${gameId}/Images/${ag.answer["#text"]}`
                          }
                          alt="image"
                          className="h-48 p-2"
                        />
                      </picture>)}
                    </div>
                  )
                }
                )}
              </div>
            )}
          </>)
        }
      </div>
    </div>
  );
};
