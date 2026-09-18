import { Button, Space } from "antd";
import { ChangeEvent, FC, KeyboardEvent, useCallback } from "react";
import { Input } from "../override/Input";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";

export const PlayerInSetting: FC<{
  onDelete: () => void;
  onChangeName: (name: string) => void;
  onChangeKey: (code: string) => void;
  name: string;
  keyboardKey: string;
}> = ({ onDelete, onChangeName, onChangeKey, name, keyboardKey }) => {
  const changeName = useDebouncedCallback(onChangeName, 450)
  const handleChangeName = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    changeName(event.target.value)
  }, [changeName])
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Tab') {
      return
    }
    event.preventDefault()
    onChangeKey(event.code)
  }, [onChangeKey])
  return (
    <Space.Compact>
      <Input placeholder="Имя" defaultValue={name} onChange={handleChangeName} />
      <Input placeholder="Кнопка" value={keyboardKey} onKeyDown={handleKeyDown} readOnly />
      <Button type="primary" danger onClick={onDelete}>
        Удалить
      </Button>
    </Space.Compact>
  );
};
