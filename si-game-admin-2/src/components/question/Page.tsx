import { FC, ReactNode } from "react";
import { PageSnapshotType } from "@/types";
import MediaPlayer, { MediaPlayerType } from "../MediaPlayer";
import { HtmlContent } from "./HtmlContent";
import { useGameStore } from "@/store/game";
import { mediaUrl } from "@/utils/api";
import { formatPageText } from "@/utils/utils";

// A question page on the player screen (TV).
export const Page: FC<{
  page: PageSnapshotType
}> = ({ page }) => {
  const gameId = useGameStore(state => state.gameId)
  const elements: ReactNode[] = []
  const text = formatPageText(page.text)

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
  if (page.html) {
    elements.push(
      <div key="html" className="w-full h-full">
        <HtmlContent html={page.html} />
      </div>
    );
  }
  return <>{elements}</>
};
