import { memo } from "react";
import type { GameMeta } from "@/store/game";

// eslint-disable-next-line react/display-name
export const GameInfo: React.FC<{game: GameMeta}> = memo(({game}) => {
  return (
    <div className="w-5/6 max-w-3xl min-h-20 rounded-2xl p-4 pl-8 mb-4 backdrop-blur-sm bg-white">
      <div className="text-lg font-bold">Название игры: {game.gameName}</div>
      <div className="text-sm ">id игры: {game.gameId}</div>
    </div>
  );
});
