import { FC } from "react";
import { PageSnapshotType } from "@/types";
import { formatPageText } from "@/utils/utils";

export const HostReplic: FC<{ page: PageSnapshotType; compact?: boolean }> = ({ page, compact }) => {
  const replic = formatPageText(page.replic).trim();
  if (!replic) {
    return null;
  }
  return (
    <section
      aria-label="Реплика ведущего"
      className={`w-full shrink-0 overflow-y-auto border-t-4 border-yellow-300 bg-blue-950/70 px-3 py-2 text-left ${compact ? "max-h-[50%] text-base" : "max-h-[40%] text-lg"}`}
    >
      <div className="text-sm font-bold uppercase tracking-wider text-yellow-300">Реплика ведущего</div>
      <div className={`whitespace-pre-line ${compact ? "line-clamp-2" : ""}`}>{replic}</div>
    </section>
  );
};
