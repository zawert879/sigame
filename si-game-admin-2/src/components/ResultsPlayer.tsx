
import { Player } from "@/types";
import { convertToRoman } from "@/utils/utils";
import { memo, FC } from "react";

const placeClassName = (place: number): string => {
  switch (place) {
    case 1:
      return 'bg-gradient-to-t from-yellow-600 to-yellow-500 text-gray-700'
    case 2:
      return 'bg-gradient-to-t from-slate-300 to-slate-100 text-gray-700'
    case 3:
      return 'bg-gradient-to-t from-yellow-700 to-orange-400 text-gray-700'
    default:
      return 'bg-gradient-to-t from-indigo-600 to-indigo-500'
  }
}

// eslint-disable-next-line react/display-name
export const ResultsPlayer: FC<{ player?: Player & { place: number } }> = memo(({ player }) => {
  if (!player) {
    return null
  }
  return (
    <div className="h-full min-w-60 w-[400px] flex bg-gradient-to-t from-blue-600 to-indigo-900 flex-col text-center border overflow-hidden">
      <div className={`h-1/6 text-3xl ${placeClassName(player.place)}`}>
        <span>{convertToRoman(player.place)}</span>
      </div>
      <div className="bg-slate-800 h-2/6">
        <span>{player.name}</span>
      </div>
      <div className="h-3/6  text-3xl flex flex-col">
        <span>{player.score} очков</span>
        <span>{player.win} правильных</span>
        <span>{player.lose} неверных</span>
      </div>
    </div>
  )
})
