import { FC, ReactNode } from "react";
import { PageSnapshotType } from "@/types";
import MediaPlayer, { MediaPlayerType } from "../MediaPlayer";
import { HtmlContent } from "../question/HtmlContent";
import { useGameStore } from "@/store/game";
import { mediaUrl } from "@/utils/api";
import { formatPageText } from "@/utils/utils";

// A question page on the admin screen: the current page with media controls or the preview of the next one.
export const AdminPage: FC<{
  page: PageSnapshotType;
  isPreview?: boolean;
}> = ({ page, isPreview }) => {
  const gameId = useGameStore(state => state.gameId);
  const elements: ReactNode[] = [];
  const text = formatPageText(page.text);
  const mediaType = isPreview ? MediaPlayerType.Preview : MediaPlayerType.Admin;

  if (text) {
    elements.push(
      <div key="text" className="grow flex justify-center items-center">
        <span>{text}</span>
      </div>
    );
  }

  if (page.image) {
    elements.push(
      <picture
        key="image"
        className={isPreview
          ? "grow flex flex-nowrap items-center h-full p-1 justify-center mb-1"
          : "grow flex flex-nowrap items-center h-1 mb-1"}
      >
        <img
          src={mediaUrl(gameId, "Images", page.image)}
          alt="image"
          className="h-full"
        />
      </picture>
    );
  }
  if (page.video) {
    elements.push(
      <MediaPlayer
        key="video"
        url={mediaUrl(gameId, "Video", page.video)}
        type={mediaType}
      />
    );
  }
  if (page.voice) {
    elements.push(
      <MediaPlayer
        key="voice"
        url={mediaUrl(gameId, "Audio", page.voice)}
        type={mediaType}
      />
    );
  }
  if (page.html) {
    elements.push(
      <div key="html" className="w-full grow min-h-0">
        <HtmlContent html={page.html} />
      </div>
    );
  }
  return <>{elements}</>;
};
