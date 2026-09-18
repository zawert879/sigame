import { client } from "@/client";
import usePacksStore from "@/store/packs";
import { Button, Space } from "antd";
import { useCallback, useState } from "react";
import { notifyError } from "@/utils/notify";
import type { PackInfo } from "@/types";

export const PackListItem: React.FC<{ pack: PackInfo }> = ({ pack }) => {
  const { name, file, isBroken } = pack;
  const { removePack } = usePacksStore();
  const [removing, setRemoving] = useState(false);
  const [starting, setStarting] = useState(false);

  const handleRemovePack = useCallback(async () => {
    setRemoving(true);
    try {
      await removePack(file);
    } catch (error) {
      notifyError(error, 'Не удалось удалить пак');
    } finally {
      setRemoving(false);
    }
  }, [file, removePack]);

  const handleChoosePack = useCallback(async () => {
    setStarting(true);
    try {
      await client.selectPack(file)
    } catch (error) {
      notifyError(error, 'Не удалось запустить пак')
    } finally {
      setStarting(false);
    }
  }, [file]);

  return (
    <div className="h-16 w-full border-b-2 px-4 flex justify-between">
      <div className="flex flex-col justify-center min-w-0">
        <div className={`text-lg font-bold truncate ${isBroken ? 'text-red-600' : ''}`}>{isBroken ? 'Не удалось прочитать пак' : name || file}</div>
        <div className="text-sm text-gray-600 truncate">{file}</div>
      </div>
      <div className="flex">
        <Space>
          <Button onClick={handleChoosePack} loading={starting} disabled={isBroken}>Играть</Button>
          <Button danger loading={removing} onClick={handleRemovePack}>Удалить</Button>
        </Space>
      </div>
    </div>
  );
};
