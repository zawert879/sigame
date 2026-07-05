import { Card, Space } from "antd/lib";
import { GameCard } from "./GameCard";
import { memo, useCallback, useEffect, useState } from "react";
import { client } from "@/client";
import { ResponseGetGames } from "@/types";
import { useRouter } from "next/router";
import { InputSearch } from "./override/InputSearch";

// eslint-disable-next-line react/display-name
export const Games: React.FC = memo(() => {
  const [games, setGames] = useState<ResponseGetGames>([])
  const router = useRouter()

  useEffect(() => {
    const fetchGames = async () => {
      const games = await client.getGames();
      setGames(games);
    }
    fetchGames()
  }, [])

  const onNewGame = useCallback(async (value: string) => {
    if (value.length < 1) return;
    const game = await client.newGame(value);
    router.push(`/admin/${game.gameId}`)
  }, [])

  return (
    <>
      <div className="h-[85vh] overflow-auto w-[820px]">
        <Space direction="vertical">
          {
            games.map(game =>
              <GameCard key={game.gameId} title={game.gameName ?? 'default'} id={game.gameId} packageName={game.packageName} />
            )
          }
        </Space>
      </div>
      <Card className=" mt-2 w-[820px]">
        <InputSearch placeholder="Название лобби" enterButton="Новая игра" allowClear onSearch={onNewGame} size="large" />
      </Card>
    </>
  )
});
