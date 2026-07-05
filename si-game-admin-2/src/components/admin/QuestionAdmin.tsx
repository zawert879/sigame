import { FC, useCallback } from "react";
import { StopOutlined } from "@ant-design/icons/lib";
import { Space } from "antd/lib";
import { costToString, getLocalizedQuestionType } from "@/utils/utils";
import { QuestionType as QuestionTypeComponent } from "@/components/question/QuestionType";
import { QuestionAnswerType, QuestionType, SelectionModeType } from "@/data";
import { PayloadQuestionPage, PayloadStartQuestion } from "@/types";
import { AdminPage } from "./AdminPage";
import { getGameIdFromPath } from "@/utils/route";

export const QuestionAdmin: FC<{ question: PayloadStartQuestion, pageData: PayloadQuestionPage, isPreparation: boolean }> = ({ question, pageData, isPreparation }) => {
  const gameId = getGameIdFromPath()
  const subText = useCallback((text: string, count: number) => {
    if (text.length < count) {
      return text;
    }
    return `${text.substring(0, count)}...`;
  }, []);
  return (
    <>
      <div className="bg-orange-500 h-[30px] w-[30px] hover:w-screen overflow-hidden absolute hover:h-auto text-sm">
        <pre>{JSON.stringify(question, undefined, 4)}</pre>
      </div>
      <div className="h-[600px] bg-blue-800 text-white text-xl">
        <div className="h-[400px] border-b-2 border-b-white flex">
          <div className="w-[250px] h-full pl-4 pt-10 border-r-2 border-r-white flex flex-col">
            {question.type && (
              <div>
                Тип:{" "}
                {getLocalizedQuestionType(question.type)}
              </div>
            )}
            {question.themeName && (
              <div>Тема: {question.themeName}</div>
            )}
            {question.type !== QuestionType.DEFAULT && (
              <div>
                Себе: {question.selectionMode === SelectionModeType.ANY ? <>Можно</> : <>Нельзя</>}
              </div>
            )}
            {question.selectPrice && (
              <div>Цена: {costToString(question.selectPrice)}</div>
            )}
          </div>
          <div
            className={`h-[400px] w-full border-b-white flex flex-col justify-end items-center text-center hyphens-auto ${pageData.currentPage?.isMarker && "border-white border-[10px]"}`}
          >
            {isPreparation
              ? <QuestionTypeComponent text={question.type} /> :
              pageData.currentPage && (<AdminPage page={pageData.currentPage} isAdmin />)}
          </div>
          <div className="w-1/4">
            {question.answerType === QuestionAnswerType.Group && question.answerGroup.length > 0 && (
              <div className="h-[400px] py-4 w-1/4 border-l-white border-l-2 ml-4 flex flex-col justify-around items-center">
                {question.answerGroup.map((ag, index) => {
                  console.warn(ag);
                  return (
                    <div key={ag.variant} className="flex">
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
                          className="h-full"
                        />
                      </picture>)}
                    </div>
                  )
                }
                )}
              </div>
            )}
          </div>
        </div>
        <div className="h-[200px] w-full flex">
          <div className="w-1/2 h-full flex flex-col">
            {question.comments && (
              <div className="w-full h-[100px] flex text-center justify-center items-center border-b-2 px-2 border-b-white">
                {subText(question.comments, 160)}
              </div>
            )}

            <div className="w-full h-full flex flex-col justify-center pl-4">
              {question.rightAnswer &&
                question.rightAnswer.map((answer, index) => (
                  <div key={index}>
                    {question.rightAnswer && subText(answer, 160)}
                  </div>
                ))}
            </div>
          </div>
          <div className={`w-1/2 h-full border-l-2 border-l-white text-center flex justify-center items-center ${pageData.nextPage?.isMarker && "border-white border-[10px] border-l-[10px]"}`}>
            {pageData.nextPage ? (
              <AdminPage page={pageData.nextPage} isAdmin isPreview />
            ) : (
              <Space direction="vertical">
                <StopOutlined style={{ fontSize: 50 }} />
                <div>Конец вопроса</div>
              </Space>
            )}
          </div>
        </div>
      </div >
    </>
  );
  return <></>
};
