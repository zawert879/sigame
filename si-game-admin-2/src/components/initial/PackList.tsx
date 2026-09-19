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
    <ul className="m-0 mb-3 list-none p-0">
      {packs.map(pack => <PackListItem key={pack.file} pack={pack} />)}
    </ul>
  );
};
