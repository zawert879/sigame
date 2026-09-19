import { FC } from "react";
import { PageSnapshotType } from "@/types";
import { isAbsoluteUrl, mediaUrl } from "@/utils/api";

export const hasHtmlContent = (page: PageSnapshotType): boolean => !!page.htmlFile || !!page.html?.trim();

export const HtmlContent: FC<{ page: PageSnapshotType; gameId: string | null; className?: string }> = ({ page, gameId, className }) => {
  const inline = page.html?.trim() ?? "";
  const source = page.htmlFile
    ? { src: mediaUrl(gameId, "Html", page.htmlFile) }
    : isAbsoluteUrl(inline)
      ? { src: inline }
      : { srcDoc: page.html ?? "" };

  return (
    <iframe
      title="HTML"
      sandbox=""
      referrerPolicy="no-referrer"
      className={`block w-full h-full border-0 bg-white ${className ?? ""}`}
      {...source}
    />
  );
};
