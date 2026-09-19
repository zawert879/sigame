import React from "react";
import { FitText } from "../FitText";
import { useGameStore } from "@/store/game";
import { formatPageText } from "@/utils/utils";

const GAME_TITLE = "Своя игра";

export const Screensaver: React.FC<{ className?: string }> = ({ className }) => {
  const packageName = useGameStore(state => formatPageText(state.meta?.packageName).trim());

  return (
    <div
      role="img"
      aria-label={packageName ? `${GAME_TITLE}: ${packageName}` : GAME_TITLE}
      className={`tv-stage text-white h-full w-full flex flex-col justify-center items-center gap-[3%] px-[5%] py-[5%] ${className ?? "text-5xl"}`}
    >
      {packageName
        ? (<>
          <div className="w-full h-[15%] min-h-4 shrink-0">
            <FitText min={9} className="text-[0.5em] font-bold uppercase tracking-[0.25em] text-yellow-200">{GAME_TITLE}</FitText>
          </div>
          <div className="w-[70%] h-[3px] shrink-0 rounded-full bg-gradient-to-r from-transparent via-yellow-200/70 to-transparent" />
          <div className="w-full h-[46%] min-h-0 shrink-0">
            <FitText className="text-[1.25em] font-bold">{packageName}</FitText>
          </div>
        </>)
        : (
          <div className="w-full h-[50%] min-h-0">
            <FitText className="font-bold uppercase tracking-[0.2em] text-yellow-200">{GAME_TITLE}</FitText>
          </div>
        )}
    </div>
  );
};
