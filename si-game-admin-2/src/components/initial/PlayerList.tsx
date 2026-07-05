import { Player } from "@/types";
import { Button, Space } from "antd/lib";
import { useState } from "react";
import _ from "lodash";
import { client } from "@/client";
import { Input } from "../override/Input";

export const PlayerList: React.FC<{ players: Player[], deletePlayer: (id: string) => void }> = ({ players, deletePlayer }) => {
  return (
    <div className="w-full h-[600px] overflow-auto border-2 border-gray-200 rounded-2xl p-4 mb-4 backdrop-blur-sm bg-white">
      {players.map((player) => <PlayerItem player={player} key={player.id} deletePlayer={deletePlayer} />)}
    </div>
  )
};

export const PlayerItem: React.FC<{ player: Player, deletePlayer: (id: string) => void }> = ({ player, deletePlayer }) => {
  const [keyboardKey, setKeyboardKey] = useState(player.keyboardKey)

  const onChange = (value: any) => {
    client.updatePlayer(player.id, value.target.value, player.keyboardKey)
  }

  const onChangeKey = (value: any) => {
    setKeyboardKey(value.code)
    client.updatePlayer(player.id, player.name, value.code)
  }

  return (
    <div className="py-2 w-full border-b-2 px-4 flex justify-between">
      <div className="flex flex-col justify-center">
        <Input className="text-lg font-bold" defaultValue={player.name} onChange={_.debounce(onChange, 450)} />
        <div>
          <div className="text-sm text-gray-600">id: {player.id}</div>
        </div>
      </div>
      <div className="flex items-start">
        <Space>
          <Input className="text-lg font-bold" defaultValue={player.keyboardKey} value={keyboardKey} onKeyDown={onChangeKey} />

          <Button danger onClick={() => deletePlayer(player.id)} >Удалить</Button>
        </Space>
      </div>
    </div>
  );
}