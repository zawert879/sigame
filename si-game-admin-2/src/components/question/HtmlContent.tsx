import { FC } from "react";
import { isAbsoluteUrl } from "@/utils/api";

// Inline HTML has at least one tag (or a comment / doctype).
const MARKUP = /<[a-z!/?][^>]*>/i;

// HTML content of a question page: an absolute URL or inline markup, isolated in a sandboxed iframe (no scripts, no
// same-origin access). Anything else is a reference to an HTML file inside the pack (SIQ 5 isRef="True" items, SIQ 4
// "@file.html"); the server does not extract those files, so an explicit placeholder is shown instead of the file name.
export const HtmlContent: FC<{ html: string; className?: string }> = ({ html, className }) => {
  const source = html.trim();
  const isUrl = isAbsoluteUrl(source);

  if (!isUrl && !MARKUP.test(source)) {
    return (
      <div className={`w-full h-full flex justify-center items-center text-3xl ${className ?? ""}`}>
        HTML-файл пака не поддерживается
      </div>
    );
  }

  return (
    <iframe
      title="HTML"
      sandbox=""
      referrerPolicy="no-referrer"
      className={`w-full h-full border-0 bg-white ${className ?? ""}`}
      {...(isUrl ? { src: source } : { srcDoc: html })}
    />
  );
};
