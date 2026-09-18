import { client } from "@/client";
import usePacksStore from "@/store/packs";
import { Button, Space } from "antd";
import { useCallback, useState } from "react";
import { notifyError } from "@/utils/notify";

export const PackListItem: React.FC<{ title: string; file: string; }> = ({ title, file }) => {
  const { removePack } = usePacksStore();
  const [removing, setRemoving] = useState(false);
  const [starting, setStarting] = useState(false);
  // the server could not read content.xml of this file
  const isBroken = !title;

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

  // big packs take a while: the server extracts the media before it answers
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
        <div className={`text-lg font-bold truncate ${isBroken ? 'text-red-600' : ''}`}>{isBroken ? 'Не удалось прочитать пак' : title}</div>
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
