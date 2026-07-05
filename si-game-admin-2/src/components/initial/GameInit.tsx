import { Button, Collapse, CollapseProps } from "antd/lib"
import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { EventUpdatePlayers, ResponseGetGame, ResponseGetPlayers } from "@/types"
import { GameInfo } from "../GameInfo";
import { PackList } from "./PackList";
import { UploadPack } from "../UploadPack";
import { PlayerList } from "./PlayerList";
import { client } from "@/client";
import { Event } from "@/data";

// eslint-disable-next-line react/display-name
export const GameInit: React.FC<{ game: ResponseGetGame, forceRefreshCb: () => void }> = memo(({ game, forceRefreshCb }) => {
  const [players, setPlayers] = useState<ResponseGetPlayers>([])

  const onUpdatePlayer = useCallback((data: EventUpdatePlayers) => {
    let buff = [...players]
    for (const player of data.added) {
      buff.push(player)
    }

    buff = buff.filter(player => {
      return !data.removed.includes(player.id)
    })

    for (const player of data.updated) {
      const found = buff.find(p => p.id === player.id)
      if (found) {
        found.keyboardKey = player.keyboardKey
        found.name = player.name
      }
    }

    setPlayers(buff)
  }, [players])

  useEffect(() => {
    client.socket.socketIo.on(Event.OnUpdatePlayers, onUpdatePlayer)

    return () => {
      client.socket.socketIo.off(Event.OnUpdatePlayers, onUpdatePlayer)
    }
  }, [onUpdatePlayer])

  useEffect(() => {
    const fetch = async () => {
      setPlayers(await client.getPlayers())
    }
    fetch()
  }, [])

  const onDeletePlayer = useCallback(async (playerId: string) => {
    await client.removePlayer(playerId)
  }, [])

  const onNewPlayer = useCallback(async () => {
    await client.addPlayer()
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
        <PackList forceRefreshCb={forceRefreshCb} />
        <UploadPack />
      </div>,
    },
  ], [forceRefreshCb, onDeletePlayer, onNewPlayer, players]);

  return (
    <>
      <GameInfo game={game} />
      <Collapse accordion items={items} defaultActiveKey="1" className="w-5/6 max-w-3xl" />
    </>
  )
})
