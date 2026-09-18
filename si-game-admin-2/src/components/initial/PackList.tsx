import usePacksStore from "@/store/packs";
import { useEffect } from "react";
import { PackListItem } from "./PackListItem";
import { notifyError } from "@/utils/notify";


export const PackList: React.FC = () => {
  const { packs, fetchPacks } = usePacksStore()
  useEffect(() => {
    fetchPacks().catch(error => notifyError(error, 'Не удалось получить список паков'))
  }, [fetchPacks])

  if (packs.length === 0) return null
  return (
    <div className="w-full min-h-80 border-2 border-gray-200 rounded-2xl p-4 mb-4 backdrop-blur-sm bg-white">
      {packs.map(pack => <PackListItem key={pack.file} title={pack.name} file={pack.file} />)}
    </div>
  );
};
