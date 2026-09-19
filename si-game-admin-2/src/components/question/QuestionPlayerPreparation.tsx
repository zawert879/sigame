import { FC } from "react";
import { QuestionType } from "./QuestionType";
import { PayloadStartQuestion } from "@/types";

export const QuestionPlayerPreparation: FC<{ question: PayloadStartQuestion }> = ({ question }) => {
  return (
    <div className="h-full w-full tv-stage px-[6vw] py-[6vh]">
      <QuestionType text={question.type} className="text-[length:min(24vh,14vw)]" />
    </div>
  );
};
