import { Button, Collapse, CollapseProps } from "antd"
import { memo, useCallback, useMemo } from "react"
import { GameInfo } from "../GameInfo";
import { PackList } from "./PackList";
import { UploadPack } from "../UploadPack";
import { PlayerList } from "./PlayerList";
import { client } from "@/client";
import { useGameStore, type GameMeta } from "@/store/game";
import { notifyError } from "@/utils/notify";

// eslint-disable-next-line react/display-name
export const GameInit: React.FC<{ game: GameMeta }> = memo(({ game }) => {
  const players = useGameStore(state => state.players)

  const onDeletePlayer = useCallback(async (playerId: string) => {
    try {
      await client.removePlayer(playerId)
    } catch (error) {
      notifyError(error, 'Не удалось удалить игрока')
    }
  }, [])

  const onNewPlayer = useCallback(async () => {
    try {
      await client.addPlayer()
    } catch (error) {
      notifyError(error, 'Не удалось добавить игрока')
    }
  }, [])

  const items: CollapseProps['items'] = useMemo(() => [
    {
      key: '1',
      label: 'Настройка Участников',
      headerClass: "!text-white",
      children: <div className="w-full p-10 items-center flex flex-col ">
        <PlayerList players={players} deletePlayer={onDeletePlayer} />
        <Button type="primary" onClick={onNewPlayer}> Новый игрок </Button>
      </div>,
    },
    {
      key: '2',
      label: 'Выбор пака',
      headerClass: "!text-white ",
      children: <div className="w-full h-full p-10 items-center flex flex-col">
        <PackList />
        <UploadPack />
      </div>,
    },
  ], [onDeletePlayer, onNewPlayer, players]);

  return (
    <>
      <GameInfo game={game} />
      <Collapse accordion items={items} defaultActiveKey="1" className="w-5/6 max-w-3xl" />
    </>
  )
})
