import { Player } from "@/types";
import { Button } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { useCallback } from "react";
import { client } from "@/client";
import { notifyError } from "@/utils/notify";
import { PlayerKeyInput, PlayerNameInput } from "./PlayerFields";

export const PlayerList: React.FC<{ players: Player[], deletePlayer: (id: string) => void }> = ({ players, deletePlayer }) => {
  if (players.length === 0) {
    return <div className="py-6 text-center text-gray-500">Игроков пока нет</div>
  }
  return (
    <ul className="m-0 list-none p-0">
      {players.map((player) => <PlayerItem player={player} key={player.id} deletePlayer={deletePlayer} />)}
    </ul>
  )
};

export const PlayerItem: React.FC<{ player: Player, deletePlayer: (id: string) => void }> = ({ player, deletePlayer }) => {
  const { id, keyboardKey } = player

  const saveName = useCallback(async (name: string) => {
    try {
      await client.updatePlayer(id, name, keyboardKey)
    } catch (error) {
      notifyError(error, 'Не удалось переименовать игрока')
    }
  }, [id, keyboardKey])

  const saveKey = useCallback(async (code: string) => {
    try {
      await client.updatePlayer(id, player.name, code)
    } catch (error) {
      notifyError(error, 'Не удалось назначить кнопку')
    }
  }, [id, player.name])

  return (
    <li className="flex items-start gap-2 border-b border-gray-200 py-3 last:border-b-0">
      <PlayerNameInput className="min-w-0 flex-1 !text-base font-bold" name={player.name} onSave={saveName} />
      <PlayerKeyInput className="!text-base font-bold" code={keyboardKey} onChange={saveKey} />
      <Button danger className="shrink-0" aria-label="Удалить" title="Удалить" icon={<DeleteOutlined />} onClick={() => deletePlayer(player.id)}>
        <span className="!hidden sm:!inline lg:!hidden xl:!inline">Удалить</span>
      </Button>
    </li>
  );
}
