import { CSSProperties, FC, useRef } from "react";
import { PayloadStartQuestion } from "@/types";
import { FitText, useUniformFit } from "@/components/FitText";
import { useGameStore } from "@/store/game";
import { mediaUrl } from "@/utils/api";
import { formatPageText } from "@/utils/utils";

type AnswerOption = PayloadStartQuestion["answerGroup"][0];

const OPTION_TEXT = "[data-option-text]";

const columnsFor = (count: number, hasImages: boolean): number => {
  if (hasImages) {
    return Math.min(count, 4);
  }
  if (count <= 2) {
    return count;
  }
  if (count <= 4) {
    return 2;
  }
  if (count <= 6) {
    return 3;
  }
  return 4;
};

export const answerOptionsLayout = (options: AnswerOption[]) => {
  const hasImages = options.some(option => typeof option.answer === "object");
  const columns = Math.max(1, columnsFor(options.length, hasImages));
  const rows = Math.max(1, Math.ceil(options.length / columns));
  const longest = options.reduce((max, option) => Math.max(max, typeof option.answer === "object" ? 0 : String(option.answer).length), 0);
  return { hasImages, columns, rows, longest };
};

export const AnswerOptions: FC<{ options: AnswerOption[]; style?: CSSProperties }> = ({ options, style }) => {
  const gameId = useGameStore(state => state.gameId);
  const gridRef = useRef<HTMLDivElement>(null);
  const { columns, rows } = answerOptionsLayout(options);
  useUniformFit(gridRef, OPTION_TEXT);

  return (
    <div
      ref={gridRef}
      className="min-h-0 w-full grid gap-[1.6vmin] text-[length:min(8vh,5vw)]"
      style={{
        ...style,
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      {options.map(option => (
        typeof option.answer !== "object"
          ? (
            <div key={option.variant} className="min-w-0 min-h-0 flex rounded-xl border-2 border-white/40 bg-blue-950/45 overflow-hidden">
              <div className="shrink-0 w-[min(8vh,5vw)] px-[0.4vmin] bg-yellow-300 text-blue-950 font-bold">
                <FitText className="text-[length:min(6vh,3.6vw)]">{option.variant}</FitText>
              </div>
              <div data-option-text="" className="flex-1 min-w-0 flex overflow-hidden px-[1.2vmin] py-[0.6vmin] text-center leading-tight whitespace-pre-line">
                <span className="m-auto max-w-full">{formatPageText(option.answer)}</span>
              </div>
            </div>
          )
          : (
            <div key={option.variant} className="relative min-w-0 min-h-0 rounded-xl border-2 border-white/40 bg-blue-950/45 overflow-hidden">
              <picture className="block w-full h-full">
                <img
                  src={mediaUrl(gameId, "Images", option.answer["#text"])}
                  alt={option.variant}
                  className="block w-full h-full object-contain"
                />
              </picture>
              <span className="absolute left-0 top-0 flex min-w-[min(6vh,3.8vw)] justify-center rounded-br-xl bg-yellow-300 px-[0.6vmin] py-[0.2vmin] font-bold text-blue-950 text-[length:min(5vh,3vw)] leading-tight">
                {option.variant}
              </span>
            </div>
          )
      ))}
    </div>
  );
};
