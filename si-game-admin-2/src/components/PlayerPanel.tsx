import { Player } from "@/types";
import { convertToRoman } from "@/utils/utils";
import { FC } from "react";

export const PlayerPanel: FC<{ players: Player[] }> = ({ players }) => {
  return (<div className="h-[12vh] bg-gradient-to-b from-blue-700 to-blue-900 text-white border-b-2 border-b-white flex justify-around items-center">
    {players.map((player,index)=> <div key={index} className={`flex flex-col p-10 justify-center items-center ${player.queue === 0 ? 'bg-gradient-to-t from-first-color-from to-first-color-to' : ''} ${player.queue && player.queue > 0 ? 'bg-gradient-to-t from-second-color-from to-second-color-to' : ''} h-[12vh] grow`}>
        <div className={`text-5xl h-24 font-bold`}>{player.name}</div> 
        <div className="text-4xl h-24">{player.score}</div>
        <div className="text-4xl min-h-10 max-h-10 min-w-4">{player.queue !== null ? convertToRoman(player.queue + 1) : ''}</div>
      </div>)}
  </div>)
}