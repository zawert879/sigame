import { FC } from "react";
import { PageSnapshotType } from "@/types";
import { QuestionVideo } from "../question/QuestionVideo";
import { QuestionAudio } from "../question/QuestionAudio";
import MediaPlayer, { MediaPlayerType } from "../MediaPlayer";
import { getGameIdFromPath } from "@/utils/route";

export const AdminPage: FC<{
  page: PageSnapshotType;
  isPreview?: boolean;
  isAdmin?: boolean;
}> = ({ page, isAdmin, isPreview }) => {
  const gameId = getGameIdFromPath()
  const elements = [];

  if (page.text) {
    elements.push(
      <div key="text" className="grow flex justify-center items-center">
        <span>{page.text?.replace("ё", "e")} </span>
      </div>
    );
  }

  if (page.image) {
    elements.push(
      isPreview ? (
        <picture
          key="image"
          className="grow flex flex-nowrap items-center h-full p-1 justify-center mb-1"
        >
          <img
            src={
              /^https?:\/\//.test(page.image)
                ? page.image
                : `/api/files/${gameId}/Images/${page.image}`
            }
            alt="image"
            className="h-full"
          />
        </picture>
      ) : (
        <picture
          key="image"
          className="grow flex flex-nowrap items-center h-1 mb-1"
        >
          <img
            src={
              /^https?:\/\//.test(page.image)
                ? page.image
                : `/api/files/${gameId}/Images/${page.image}`
            }
            alt="image"
            className="h-full"
          />
        </picture>
      )
    );
  }
  if (page.video) {
    elements.push(
      <MediaPlayer
        key="video"
        url={
          /^https?:\/\//.test(page.video)
            ? page.video
            : `/api/files/${gameId}/Video/${page.video}`
        }
        type={isPreview ? MediaPlayerType.Preview :MediaPlayerType.Admin}
      />
      // <QuestionVideo
      //   key='video'
      //   url={/^https?:\/\//.test(page.video) ? page.video : `/api/files/${gameId}/Video/${page.video}`}
      //   isPreview={isPreview ?? false}
      //   isAdminButtons={isAdmin ?? false}
      // />
    );
  }
  if (page.voice) {
    elements.push(
      <MediaPlayer
        key="video"
        url={
          /^https?:\/\//.test(page.voice)
            ? page.voice
            : `/api/files/${gameId}/Audio/${page.voice}`
        }
        type={isPreview ? MediaPlayerType.Preview :MediaPlayerType.Admin}
      />
    );
  }
  if (elements.length > 0) {
    return elements;
  }
  return <div className="text-3xl">HTML не поддерживается</div>;
};
