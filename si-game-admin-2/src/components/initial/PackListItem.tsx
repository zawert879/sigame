import { client } from "@/client";
import usePacksStore from "@/store/packs";
import { Button, Space } from "antd/lib";
import { useCallback, useState } from "react";

export const PackListItem: React.FC<{ title: string; file: string; }> = ({ title, file }) => {
  const { removePacks } = usePacksStore();
  const [loading, setLoading] = useState(false);

  const handleRemovePack = useCallback(async () => {
    setLoading(true);
    await removePacks(file);
    setLoading(false);
  }, [file, removePacks]);

  const handleChoosePack = useCallback(async () => {
    await client.selectPack(file)
  }, [file]);

  return (
    <div className="h-16 w-full border-b-2 px-4 flex justify-between">
      <div className="flex flex-col justify-center">
        <div className="text-lg font-bold">{title}</div>
        <div className="text-sm text-gray-600">{file}</div>
      </div>
      <div className="flex">
        <Space>
          <Button onClick={handleChoosePack}>Играть</Button>
          <Button danger loading={loading} onClick={handleRemovePack}>Удалить</Button>
        </Space>
      </div>
    </div>
  );
};
