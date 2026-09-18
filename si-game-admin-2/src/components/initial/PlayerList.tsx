import { Player } from "@/types";
import { Button, Space } from "antd";
import { ChangeEvent, KeyboardEvent, useCallback } from "react";
import { client } from "@/client";
import { Input } from "../override/Input";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { notifyError } from "@/utils/notify";

export const PlayerList: React.FC<{ players: Player[], deletePlayer: (id: string) => void }> = ({ players, deletePlayer }) => {
  return (
    <div className="w-full h-[600px] overflow-auto border-2 border-gray-200 rounded-2xl p-4 mb-4 backdrop-blur-sm bg-white">
      {players.map((player) => <PlayerItem player={player} key={player.id} deletePlayer={deletePlayer} />)}
    </div>
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
  const saveNameDebounced = useDebouncedCallback(saveName, 450)

  const onChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    saveNameDebounced(event.target.value)
  }, [saveNameDebounced])

  const onChangeKey = useCallback(async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Tab') {
      return
    }
    event.preventDefault()
    try {
      await client.updatePlayer(id, player.name, event.code)
    } catch (error) {
      notifyError(error, 'Не удалось назначить кнопку')
    }
  }, [id, player.name])

  return (
    <div className="py-2 w-full border-b-2 px-4 flex justify-between">
      <div className="flex flex-col justify-center">
        <Input className="text-lg font-bold" defaultValue={player.name} onChange={onChange} />
        <div>
          <div className="text-sm text-gray-600">id: {player.id}</div>
        </div>
      </div>
      <div className="flex items-start">
        <Space>
          <Input className="text-lg font-bold" value={keyboardKey} onKeyDown={onChangeKey} readOnly />

          <Button danger onClick={() => deletePlayer(player.id)} >Удалить</Button>
        </Space>
      </div>
    </div>
  );
}
