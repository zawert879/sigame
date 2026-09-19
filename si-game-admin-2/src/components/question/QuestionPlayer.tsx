import { FC } from "react";
import { PageSnapshotType, PayloadQuestionPage, PayloadStartQuestion } from "@/types";
import { Page, pageHasMedia, pageText } from "./Page";
import { AnswerOptions, answerOptionsLayout } from "./AnswerOptions";
import { QuestionAnswerType } from "@/data";
import { useGameStore } from "@/store/game";

const pageWeight = (page: PageSnapshotType): number => {
  if (pageHasMedia(page)) {
    return 5;
  }
  const length = pageText(page).length;
  if (length <= 60) {
    return 2;
  }
  return length <= 200 ? 3 : 4.5;
};

const optionsWeight = (options: PayloadStartQuestion["answerGroup"]): number => {
  const { hasImages, rows, longest } = answerOptionsLayout(options);
  const perRow = hasImages ? 5 : longest <= 25 ? 1.6 : longest <= 60 ? 2.4 : 3.2;
  return Math.min(8, rows * perRow);
};

export const QuestionPlayer: FC<{ question: PayloadStartQuestion, pageData: PayloadQuestionPage }> = ({ pageData, question }) => {
  const questionRun = useGameStore(state => state.questionRun)
  const page = pageData.currentPage
  const options = question.answerType === QuestionAnswerType.Group ? question.answerGroup : []

  return (
    <div className="h-full w-full tv-stage text-white p-[2.5vmin] flex flex-col gap-[2.5vmin]">
      {page && (<>
        <div className="min-h-0 w-full" style={{ flex: `${options.length > 0 ? pageWeight(page) : 1} 1 0%` }}>
          <Page key={`${questionRun}-${pageData.pageIndex}`} page={page} withOptions={options.length > 0} />
        </div>
        {options.length > 0 && <AnswerOptions options={options} style={{ flex: `${optionsWeight(options)} 1 0%` }} />}
      </>)}
    </div>
  );
};
