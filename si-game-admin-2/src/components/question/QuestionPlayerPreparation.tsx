import { FC } from "react";
import { QuestionType } from "./QuestionType";
import { PayloadStartQuestion } from "@/types";

// Special question (stake, secret, no risk…): the player screen shows its type until the host continues.
export const QuestionPlayerPreparation: FC<{ question: PayloadStartQuestion }> = ({ question }) => {
  return (
    <div className="w-screen h-screen">
      <div
        className={`bg-blue-700 h-[90vh] w-full p-8 text-center text-white flex justify-center items-center shadow-[0_0_400px_230px_rgba(0,0,0,0.40)_inset]`}
      >
        <QuestionType text={question.type} />
      </div>
    </div>
  );
};
