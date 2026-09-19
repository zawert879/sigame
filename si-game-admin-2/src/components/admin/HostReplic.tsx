import { FC } from "react";
import { PageSnapshotType } from "@/types";
import { formatPageText } from "@/utils/utils";
import { FitText } from "../FitText";

export const hasReplic = (page: PageSnapshotType | null | undefined): boolean => !!page && formatPageText(page.replic).trim() !== "";

export const HostReplic: FC<{ page: PageSnapshotType; compact?: boolean; className?: string }> = ({ page, compact, className }) => {
  const replic = formatPageText(page.replic).trim();
  if (!replic) {
    return null;
  }
  return (
    <section
      aria-label="Реплика ведущего"
      className={`flex shrink-0 flex-col rounded-md border-l-4 border-yellow-300 bg-blue-950/70 px-2 py-1 text-white ${className ?? ""}`}
    >
      <div className="shrink-0 text-[11px] font-bold uppercase leading-4 tracking-wider text-yellow-300">Реплика ведущего</div>
      <div className="min-h-0 flex-1">
        <FitText align="left" min={11} className={compact ? "text-sm" : "text-base lg:text-xl"}>{replic}</FitText>
      </div>
    </section>
  );
};
