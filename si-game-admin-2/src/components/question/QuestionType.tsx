import { FC } from "react";
import { FitText } from "@/components/FitText";
import { getLocalizedQuestionType } from "@/utils/utils";

export const QuestionType: FC<{ text: string; className?: string }> = ({ text, className }) => {
  return (
    <FitText
      className={`text-yellow-200 uppercase ${className ?? "text-[16rem]"}`}
      innerClassName="animate-rotateText"
      style={{ textShadow: "0.04em 0.04em 0.07em black" }}
    >
      {getLocalizedQuestionType(text)}
    </FitText>
  );
};
