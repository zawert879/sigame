import { FC, ReactNode } from "react";
import { SoundOutlined } from "@ant-design/icons";
import { PageSnapshotType } from "@/types";
import MediaPlayer, { MediaPlayerType } from "../MediaPlayer";
import { HtmlContent, hasHtmlContent } from "../question/HtmlContent";
import { FitText } from "../FitText";
import { AudioVisual } from "../question/AudioVisual";
import { useGameStore } from "@/store/game";
import { mediaUrl } from "@/utils/api";
import { formatPageText } from "@/utils/utils";

type Visual = { key: string; node: ReactNode };

export const AdminPage: FC<{
  page: PageSnapshotType;
  isPreview?: boolean;
}> = ({ page, isPreview }) => {
  const gameId = useGameStore(state => state.gameId);
  const text = formatPageText(page.text).trim();

  const visuals: Visual[] = [];
  if (page.image) {
    visuals.push({
      key: "image",
      node: (
        <picture className="block h-full w-full">
          <img
            src={mediaUrl(gameId, "Images", page.image)}
            alt=""
            className="block h-full w-full object-contain"
          />
        </picture>
      ),
    });
  }
  if (page.video) {
    visuals.push({
      key: "video",
      node: (
        <MediaPlayer
          url={mediaUrl(gameId, "Video", page.video)}
          type={isPreview ? MediaPlayerType.Preview : MediaPlayerType.Admin}
        />
      ),
    });
  }
  if (hasHtmlContent(page)) {
    visuals.push({ key: "html", node: <HtmlContent page={page} gameId={gameId} /> });
  }

  const audio = page.voice
    ? isPreview
      ? (
        <div className="flex h-8 shrink-0 items-center justify-center gap-2 rounded-md bg-blue-950/60 text-sm">
          <SoundOutlined />
          <span>Аудио</span>
        </div>
      )
      : <MediaPlayer url={mediaUrl(gameId, "Audio", page.voice)} type={MediaPlayerType.Admin} audio />
    : null;

  if (!text && visuals.length === 0 && !audio) {
    return (
      <div className="flex h-full items-center justify-center text-center text-sm text-blue-200">
        {page.replic ? "Только реплика ведущего" : "Пустая страница"}
      </div>
    );
  }

  const textSize = isPreview ? "text-base lg:text-xl" : "text-2xl sm:text-3xl lg:text-5xl";
  const audioOnly = !!audio && !text && visuals.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {text && (
        <div className={visuals.length > 0 ? `${text.length > 150 ? "h-1/2" : "h-[32%]"} min-h-[2.5rem] shrink-0` : "min-h-0 flex-1"}>
          <FitText min={11} className={textSize}>{text}</FitText>
        </div>
      )}
      {visuals.length > 0 && (
        <div className="flex min-h-0 flex-1 gap-2">
          {visuals.map(visual => (
            <div key={visual.key} className="h-full min-w-0 flex-1">{visual.node}</div>
          ))}
        </div>
      )}
      {audioOnly && (
        <div className="min-h-0 flex-1">
          <AudioVisual />
        </div>
      )}
      {audio && <div className="shrink-0">{audio}</div>}
    </div>
  );
};
