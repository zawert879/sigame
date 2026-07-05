
import { Player } from "@/types";
import { convertToRoman } from "@/utils/utils";
import { memo, FC } from "react";
import { number } from "zod";

// eslint-disable-next-line react/display-name
export const ResultsPlayer: FC<{ player: Player & { place: number } }> = memo(({ player }) => {
  
  return ( player && <>
    <div className="h-full min-w-60 w-[400px] flex bg-gradient-to-t from-blue-600 to-indigo-900 flex-col text-center border">
      <div className={`h-1/6 text-3xl 

        ${player.place === 1 && 'bg-gradient-to-t from-yellow-600 to-yellow-500 text-gray-700'}
        ${player.place === 2 && 'bg-gradient-to-t from-slate-300 to-slate-100 text-gray-700'}
        ${player.place === 3 && 'bg-gradient-to-t from-yellow-700 to-orange-400 text-gray-700'}
        ${player.place > 3 && 'bg-gradient-to-t from-indigo-600 to-indigo-500 '}
      `}>
        <span>{convertToRoman(player.place)}</span>
      </div>
      <div className="bg-slate-800 h-2/6">
        <span>{player.name}</span>
      </div>
      <div className="h-3/6  text-3xl flex flex-col">
        <span>{player.score} очков</span>
        <span>{player.win} правильных</span>
        <span>{player.lose} не верных </span>
      </div>
    </div>
  </>)
})