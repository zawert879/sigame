import { memo } from "react";
import type { GameMeta } from "@/store/game";
import { FitText } from "./FitText";
import { displayGameName } from "@/utils/utils";

export const GameInfo: React.FC<{ game: GameMeta }> = memo(function GameInfo({ game }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 shadow-md sm:px-6">
      <div className="break-words text-lg font-bold">Название игры: {displayGameName(game.gameName)}</div>
      <div className="h-5 text-gray-600" title={game.gameId}>
        <FitText align="left" max={14} min={9} className="text-sm">{`id игры: ${game.gameId}`}</FitText>
      </div>
    </div>
  );
});
