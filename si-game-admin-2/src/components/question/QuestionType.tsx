import { getLocalizedQuestionType } from "@/utils/utils";
import { FC } from "react";

export const QuestionType: FC<{text: string}> = ({text}) => {
  return <div className="animate-rotateText text-[16rem] text-yellow-200 uppercase" style={{textShadow: '10px 10px 18px black'}}>
    {getLocalizedQuestionType(text)}
  </div>;
};
