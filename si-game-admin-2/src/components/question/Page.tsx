import { FC, ReactNode, SyntheticEvent, useState } from "react";
import { PageSnapshotType } from "@/types";
import MediaPlayer, { MediaPlayerType } from "../MediaPlayer";
import { HtmlContent, hasHtmlContent } from "./HtmlContent";
import { AudioVisual } from "./AudioVisual";
import { VideoVisual } from "./VideoVisual";
import { FitText } from "@/components/FitText";
import { useGameStore } from "@/store/game";
import { mediaUrl } from "@/utils/api";
import { formatPageText } from "@/utils/utils";

const TEXT_ONLY = "text-[length:min(18vh,10vw)]";
const TEXT_WITH_MEDIA = "text-[length:min(10vh,6vw)]";
const TEXT_WITH_OPTIONS = "text-[length:min(11vh,6.5vw)]";
const REPLIC_ONLY = "text-[length:min(10vh,6vw)]";
const REPLIC_CAPTION = "text-[length:min(5.5vh,3.4vw)]";

const textShare = (length: number): number => (length <= 40 ? 24 : length <= 120 ? 32 : length <= 400 ? 42 : 52);

const replicShare = (length: number): number => (length <= 60 ? 16 : length <= 180 ? 22 : 30);

type Visual = { key: string; node: ReactNode };

export const pageText = (page: PageSnapshotType): string => formatPageText(page.text).trim();

export const pageHasMedia = (page: PageSnapshotType): boolean => !!page.image || !!page.video || !!page.voice || hasHtmlContent(page);

export const Page: FC<{
  page: PageSnapshotType
  withOptions?: boolean
}> = ({ page, withOptions }) => {
  const gameId = useGameStore(state => state.gameId);
  const [portrait, setPortrait] = useState(false);
  const text = pageText(page);
  const replic = formatPageText(page.replic).trim();
  const html = hasHtmlContent(page);
  const audioOnly = !!page.voice && !page.image && !page.video && !html;

  const onImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    setPortrait(naturalWidth > 0 && naturalHeight > naturalWidth * 1.1);
  };

  const visuals: Visual[] = [];
  if (page.image) {
    visuals.push({
      key: "image",
      node: (
        <picture className="block w-full h-full">
          <img
            src={mediaUrl(gameId, "Images", page.image)}
            alt=""
            className="block w-full h-full object-contain"
            onLoad={onImageLoad}
          />
        </picture>
      ),
    });
  }
  if (page.video) {
    visuals.push({
      key: "video",
      node: <MediaPlayer url={mediaUrl(gameId, "Video", page.video)} type={MediaPlayerType.Player} idleOverlay={<VideoVisual />} />,
    });
  }
  if (html) {
    visuals.push({ key: "html", node: <HtmlContent page={page} gameId={gameId} /> });
  }
  if (audioOnly) {
    visuals.push({ key: "audio", node: <AudioVisual /> });
  }

  const media = visuals.length > 0 && (
    <div className="w-full h-full flex items-center gap-[2vmin]">
      {visuals.map(visual => (
        <div key={visual.key} className="flex-1 min-w-0 h-full">{visual.node}</div>
      ))}
      {page.voice && !audioOnly && (
        <div className="shrink-0 w-[min(18vh,14vw)] h-[min(18vh,14vw)]">
          <AudioVisual />
        </div>
      )}
    </div>
  );

  let body: ReactNode = null;
  if (text && media) {
    const sideBySide = portrait && !!page.image && !page.video && !html;
    body = (
      <div className={`flex h-full w-full ${sideBySide ? "flex-row gap-[3vmin]" : "flex-col gap-[2vmin]"}`}>
        <div
          className={sideBySide ? "flex-[3] min-w-0 h-full" : "shrink-0 min-h-0 w-full"}
          style={sideBySide ? undefined : { height: `${textShare(text.length)}%` }}
        >
          <FitText className={TEXT_WITH_MEDIA}>{text}</FitText>
        </div>
        <div className={sideBySide ? "flex-[2] min-w-0 h-full" : "flex-1 min-h-0 w-full"}>{media}</div>
      </div>
    );
  } else if (text) {
    body = <FitText className={withOptions ? TEXT_WITH_OPTIONS : TEXT_ONLY}>{text}</FitText>;
  } else if (media) {
    body = media;
  } else if (replic) {
    body = <FitText className={`${REPLIC_ONLY} text-yellow-100`}>{replic}</FitText>;
  }

  const caption = replic && (text || media)
    ? (
      <div className="shrink-0 min-h-0 w-full rounded-xl bg-black/40 text-yellow-100 px-[2vmin] py-[0.8vmin]" style={{ height: `${replicShare(replic.length)}%` }}>
        <FitText className={REPLIC_CAPTION}>{replic}</FitText>
      </div>
    )
    : null;

  return (
    <div className="relative h-full w-full flex flex-col gap-[2vmin]">
      {page.voice && (
        <div className="absolute left-0 top-0 w-px h-px overflow-hidden opacity-0 pointer-events-none">
          <MediaPlayer url={mediaUrl(gameId, "Audio", page.voice)} type={MediaPlayerType.Player} />
        </div>
      )}
      <div className="flex-1 min-h-0 w-full">{body}</div>
      {caption}
    </div>
  );
};
