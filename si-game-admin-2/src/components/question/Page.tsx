import { FC } from "react";
import { PageSnapshotType } from "@/types";
import { QuestionVideo } from "./QuestionVideo";
import { QuestionAudio } from "./QuestionAudio";
import MediaPlayer, { MediaPlayerType } from "../MediaPlayer";
import { getGameIdFromPath } from "@/utils/route";

export const Page: FC<{
  page: PageSnapshotType
  isPreview?: boolean;
  isAdmin?: boolean;
}> = ({ page, isAdmin, isPreview }) => {
  const gameId = getGameIdFromPath()
  const elements = []

  if (page.text) {
    elements.push(
      <div key='text' className="grow flex justify-center items-center">
        <span>{page.text?.replace('ё', 'e')}</span>
      </div>
    )
  }

  if (page.image) {
    elements.push(
      <picture key='image' className="w-full h-full">
        <img
          src={/^https?:\/\//.test(page.image) ? page.image : `/api/files/${gameId}/Images/${page.image}`}
          alt="image"
          className="w-full h-full object-contain"
        />
      </picture>
    );
  }
  if (page.video) {
    elements.push(
      // <QuestionVideo
      //   key='video'
      //   url={/^https?:\/\//.test(page.video) ? page.video : `/api/files/${gameId}/Video/${page.video}`}
      //   isPreview={isPreview ?? false}
      //   isAdminButtons={isAdmin ?? false}
      // />
      <MediaPlayer
        key="video"
        url={
          /^https?:\/\//.test(page.video)
            ? page.video
            : `/api/files/${gameId}/Video/${page.video}`
        }
        type={MediaPlayerType.Player}
      />
    );
  }
  if (page.voice) {
    elements.push(
      <div>
        <img src="/music_note.svg" alt="MUSIC" className="h-16 animate-rotateText" />
        <MediaPlayer
          key="video"
          url={
            /^https?:\/\//.test(page.voice) ? page.voice : `/api/files/${gameId}/Audio/${page.voice}`
          }
          type={MediaPlayerType.Player}
        />
      </div>
      // <QuestionAudio
      //   key='audio'
      //   url={/^https?:\/\//.test(page.voice) ? page.voice : `/api/files/${gameId}/Video/${page.voice}`}
      //   isPreview={isPreview}
      //   isAdmin={isAdmin}
      // />
    );
  }
  if (elements.length > 0) {
    return elements
  }
  return <div className="text-3xl">HTML не поддерживается</div>;
};
