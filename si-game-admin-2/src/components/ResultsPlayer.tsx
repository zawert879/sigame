import { memo, FC } from "react";
import { FitText } from "./FitText";
import { Player } from "@/types";
import { convertToRoman, formatAnswerCounts, formatPageText, formatScore } from "@/utils/utils";

const placeClassName = (place: number): string => {
  switch (place) {
    case 1:
      return 'bg-gradient-to-t from-yellow-600 to-yellow-500 text-gray-800'
    case 2:
      return 'bg-gradient-to-t from-slate-300 to-slate-100 text-gray-800'
    case 3:
      return 'bg-gradient-to-t from-yellow-700 to-orange-400 text-gray-800'
    default:
      return 'bg-gradient-to-t from-indigo-600 to-indigo-500 text-white'
  }
}

export const ResultsPlayer: FC<{ player?: Player & { place: number } }> = memo(function ResultsPlayer({ player }) {
  if (!player) {
    return null
  }
  return (
    <div className="h-full w-full min-w-0 flex flex-col rounded-xl overflow-hidden border-2 border-white/50 bg-gradient-to-t from-blue-600 to-indigo-900 text-white shadow-xl">
      <div className={`h-[20%] shrink-0 font-bold ${placeClassName(player.place)}`}>
        <FitText className="text-[length:min(5vh,3vw)]">{convertToRoman(player.place)}</FitText>
      </div>
      <div className="h-[34%] shrink-0 bg-slate-800/90 px-[0.8vmin]">
        <FitText className="font-bold text-[length:min(7vh,4vw)]">{formatPageText(player.name)}</FitText>
      </div>
      <div className="flex-1 min-h-0 flex flex-col px-[0.8vmin] py-[0.6vmin]">
        <div className="flex-[3] min-h-0">
          <FitText className="text-[length:min(6vh,3.4vw)]">{formatScore(player.score)}</FitText>
        </div>
        <div className="flex-[2] min-h-0">
          <FitText className="text-[length:min(3.6vh,2.2vw)] text-blue-100">{formatAnswerCounts(player.win, player.lose)}</FitText>
        </div>
      </div>
    </div>
  )
})
