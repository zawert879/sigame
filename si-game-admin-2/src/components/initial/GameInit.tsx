import { Button } from "antd"
import { UserAddOutlined } from "@ant-design/icons"
import { memo, useCallback } from "react"
import { GameInfo } from "../GameInfo";
import { PackList } from "./PackList";
import { UploadPack } from "../UploadPack";
import { PlayerList } from "./PlayerList";
import { client } from "@/client";
import { useGameStore, type GameMeta } from "@/store/game";
import { notifyError } from "@/utils/notify";

const CARD = "min-w-0 rounded-2xl bg-white p-3 shadow-md sm:p-5"
const TITLE = "m-0 mb-2 text-lg font-bold sm:text-xl"

export const GameInit: React.FC<{ game: GameMeta }> = memo(function GameInit({ game }) {
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:gap-4">
      <GameInfo game={game} />
      <div className="grid items-start gap-3 sm:gap-4 lg:grid-cols-2">
        <section aria-label="Настройка участников" className={CARD}>
          <h2 className={TITLE}>Настройка участников</h2>
          <PlayerList players={players} deletePlayer={onDeletePlayer} />
          <Button type="primary" size="large" block className="mt-2" icon={<UserAddOutlined />} onClick={onNewPlayer}>
            Новый игрок
          </Button>
        </section>
        <section aria-label="Выбор пака" className={CARD}>
          <h2 className={TITLE}>Выбор пака</h2>
          <PackList />
          <UploadPack />
        </section>
      </div>
    </div>
  )
})
