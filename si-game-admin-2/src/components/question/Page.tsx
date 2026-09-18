import { FC, ReactNode } from "react";
import { PageSnapshotType } from "@/types";
import MediaPlayer, { MediaPlayerType } from "../MediaPlayer";
import { HtmlContent, hasHtmlContent } from "./HtmlContent";
import { useGameStore } from "@/store/game";
import { mediaUrl } from "@/utils/api";
import { formatPageText } from "@/utils/utils";

export const Page: FC<{
  page: PageSnapshotType
}> = ({ page }) => {
  const gameId = useGameStore(state => state.gameId)
  const elements: ReactNode[] = []
  const text = formatPageText(page.text)
  const replic = formatPageText(page.replic).trim()

  if (text) {
    elements.push(
      <div key='text' className="grow flex justify-center items-center">
        <span>{text}</span>
      </div>
    )
  }

  if (page.image) {
    elements.push(
      <picture key='image' className="w-full h-full">
        <img
          src={mediaUrl(gameId, 'Images', page.image)}
          alt="image"
          className="w-full h-full object-contain"
        />
      </picture>
    );
  }
  if (page.video) {
    elements.push(
      <MediaPlayer
        key="video"
        url={mediaUrl(gameId, 'Video', page.video)}
        type={MediaPlayerType.Player}
      />
    );
  }
  if (page.voice) {
    elements.push(
      <div key="voice">
        <picture>
          <img src="/music_note.svg" alt="MUSIC" className="h-16 animate-rotateText" />
        </picture>
        <MediaPlayer
          url={mediaUrl(gameId, 'Audio', page.voice)}
          type={MediaPlayerType.Player}
        />
      </div>
    );
  }
  if (hasHtmlContent(page)) {
    elements.push(
      <div key="html" className="w-full h-full">
        <HtmlContent page={page} gameId={gameId} />
      </div>
    );
  }

  if (elements.length === 0) {
    return (
      <div className="flex-1 min-w-0 h-full flex justify-center items-center">
        {replic && <span className="whitespace-pre-line">{replic}</span>}
      </div>
    )
  }

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col">
      <div className="grow min-h-0 w-full flex justify-center items-center">
        {elements}
      </div>
      {replic && (
        <div className="shrink-0 max-h-[35%] overflow-hidden mt-4 mx-auto max-w-full px-6 py-3 rounded-xl bg-black/40 text-yellow-100 text-[0.4em] leading-snug whitespace-pre-line">
          {replic}
        </div>
      )}
    </div>
  )
};
