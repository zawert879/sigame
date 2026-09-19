import { client } from "@/client";
import usePacksStore from "@/store/packs";
import { Button } from "antd";
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
    <li className="flex flex-col gap-2 border-b border-gray-200 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className={`break-words text-base font-bold leading-snug sm:text-lg ${isBroken ? 'text-red-600' : ''}`}>{isBroken ? 'Не удалось прочитать пак' : name || file}</div>
        <div className="break-all text-sm text-gray-600">{file}</div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button type="primary" className="flex-1 sm:flex-none" onClick={handleChoosePack} loading={starting} disabled={isBroken}>Играть</Button>
        <Button danger className="flex-1 sm:flex-none" loading={removing} onClick={handleRemovePack}>Удалить</Button>
      </div>
    </li>
  );
};
