import { FC } from "react";
import { Player } from "@/types";
import { convertToRoman, formatPageText } from "@/utils/utils";
import { FitText } from "@/components/FitText";

const queueClassName = (queue: number | null): string => {
  if (queue === 0) {
    return "bg-gradient-to-t from-first-color-from to-first-color-to text-blue-950";
  }
  if (queue !== null && queue > 0) {
    return "bg-gradient-to-t from-second-color-from to-second-color-to text-blue-950";
  }
  return "text-white";
};

export const PlayerPanel: FC<{ players: Player[] }> = ({ players }) => {
  return (
    <div className="shrink-0 h-[clamp(80px,15vh,170px)] flex bg-gradient-to-b from-blue-700 to-blue-900 border-b-2 border-b-white">
      {players.map(player => (
        <div
          key={player.id}
          className={`flex-1 min-w-0 h-full flex flex-col px-[0.6vw] py-[0.5vh] border-r border-r-white/25 last:border-r-0 ${queueClassName(player.queue)}`}
        >
          <div className="flex-[40] min-h-0">
            <FitText className="font-bold text-[length:min(5.2vh,3vw)]">{formatPageText(player.name)}</FitText>
          </div>
          <div className="flex-[32] min-h-0">
            <FitText className="text-[length:min(4.6vh,3vw)]">{player.score}</FitText>
          </div>
          <div className="flex-[28] min-h-0">
            {player.queue !== null && (
              <FitText className="font-bold text-[length:min(4vh,2.6vw)]">{convertToRoman(player.queue + 1)}</FitText>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
