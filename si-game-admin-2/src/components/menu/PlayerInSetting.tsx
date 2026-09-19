import { Button } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { FC } from "react";
import { PlayerKeyInput, PlayerNameInput } from "../initial/PlayerFields";

export const PlayerInSetting: FC<{
  onDelete: () => void;
  onChangeName: (name: string) => void;
  onChangeKey: (code: string) => void;
  name: string;
  keyboardKey: string;
}> = ({ onDelete, onChangeName, onChangeKey, name, keyboardKey }) => {
  return (
    <div className="flex items-start gap-2">
      <PlayerNameInput className="min-w-0 flex-1" name={name} onSave={onChangeName} />
      <PlayerKeyInput code={keyboardKey} onChange={onChangeKey} />
      <Button type="primary" danger className="shrink-0" aria-label="Удалить" title="Удалить" icon={<DeleteOutlined />} onClick={onDelete} />
    </div>
  );
};
