import { FC } from "react";
import { PayloadQuestionPage, PayloadStartQuestion } from "@/types";
import { Page } from "./Page";
import { QuestionAnswerType } from "@/data";
import { useGameStore } from "@/store/game";
import { mediaUrl } from "@/utils/api";

export const QuestionPlayer: FC<{ question: PayloadStartQuestion, pageData: PayloadQuestionPage }> = ({ pageData, question }) => {
  const gameId = useGameStore(state => state.gameId)
  const questionRun = useGameStore(state => state.questionRun)
  return (
    <div className="w-screen h-screen">
      <div
        className={`bg-blue-700 h-[90vh] w-full p-8 text-center text-white flex justify-center items-center shadow-[0_0_400px_230px_rgba(0,0,0,0.40)_inset]`}
        style={{
          fontSize: 'calc(1em + 4vw)'
        }}
      >
        {
          pageData.currentPage && (<>
            <Page key={`${questionRun}-${pageData.pageIndex}`} page={pageData.currentPage} />
            {question.answerType === QuestionAnswerType.Group && question.answerGroup.length > 0 && (
              <div className="py-4 w-1/4 border-l-white border-l-2 ml-4 flex flex-col justify-around items-center">
                {question.answerGroup.map((ag) => {
                  return (
                    <div key={ag.variant} className="flex items-center">
                      {ag.variant}: {typeof ag.answer !== 'object' ? ag.answer : (<picture
                        key="image"
                        className=""
                      >
                        <img
                          src={mediaUrl(gameId, 'Images', ag.answer["#text"])}
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
