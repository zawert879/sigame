import { Button, Space } from "antd/lib";
import _ from "lodash";
import { ChangeEvent, FC, useCallback } from "react";
import { Input } from "../override/Input";

export const PlayerInSetting: FC<{ onDelete: () => void; onChangeName: (name: string) => void, name: string }> = ({ onDelete, onChangeName, name }) => {
  const handleChangeName = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    onChangeName(event.target.value)
  }, [onChangeName])
  return (
    <Space.Compact>
      <Input placeholder="Имя" defaultValue={name} onChange={_.debounce(handleChangeName,450)} />
      <Input placeholder="Кнопка" />
      <Button type="primary" danger onClick={onDelete}>
        Удалить
      </Button>
    </Space.Compact>
  );
};
