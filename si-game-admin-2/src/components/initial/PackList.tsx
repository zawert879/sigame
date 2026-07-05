import usePacksStore from "@/store/packs";
import { useEffect } from "react";
import { PackListItem } from "./PackListItem";


export const PackList: React.FC<{ forceRefreshCb: () => void }> = ({ forceRefreshCb }) => {
  const { packs, fetchPacks } = usePacksStore()
  useEffect(() => {
    (async () => {
      await fetchPacks()
      forceRefreshCb()
    })()
  }, [fetchPacks, forceRefreshCb])

  if (packs.length === 0) return null
  return (
    <div className="w-full min-h-80 border-2 border-gray-200 rounded-2xl p-4 mb-4 backdrop-blur-sm bg-white">
      {packs.map(pack => <PackListItem key={pack.file} title={pack.name} file={pack.file} />)}
    </div>
  );
};
