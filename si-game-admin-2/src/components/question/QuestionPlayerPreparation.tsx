import * as Data from "@/data";
import { timeout } from "@/utils/utils";
import { FC, useEffect, useRef, useState } from "react";
// import { Question } from "../../../question";
import { QuestionType } from "./QuestionType";
import { PlayerPanel } from "../PlayerPanel";
import { PayloadQuestionPage, PayloadStartQuestion } from "@/types";
import { Page } from "./Page";
// import useGameStore from "@/store/game";

export const QuestionPlayerPreparation: FC<{ question: PayloadStartQuestion, pageData: PayloadQuestionPage }> = ({ pageData, question }) => {
  const div = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const minSize = 1;
    const maxSize = 99;
    let size = maxSize;
    if (div.current) {
      do {
        div.current.style.fontSize = size + "px";
        size = size - 10;
      } while (
        (div.current.clientWidth < div.current.scrollWidth ||
          div.current.clientHeight < div.current.scrollHeight) &&
        size > minSize
      );
    }
  }, [pageData.currentPage?.text, div.current?.clientWidth]);

  return (
    <div className="w-screen h-screen">
      <div
        ref={div}
        className={`bg-blue-700 h-[90vh] w-full p-8 text-center text-white flex justify-center items-center shadow-[0_0_400px_230px_rgba(0,0,0,0.40)_inset]`}
      >
        <QuestionType text={question.type} />
      </div>
    </div>
  );
};
