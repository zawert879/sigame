"use client";
import { CSSProperties, FC, ReactNode, memo, useCallback, useEffect, useRef, useState } from "react";
import {
  MediaController,
  MediaControlBar,
  MediaTimeRange,
  MediaTimeDisplay,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
} from "media-chrome/react";
import { PlayCircleOutlined } from "@ant-design/icons";
import ReactPlayer from "react-player";
import { client } from "@/client";
import { eventEmitter } from "@/eventEmitter";
import { EventUpdateMediaPlayer } from "@/types";
import { mediaPosition, toMediaVolume, useGameStore } from "@/store/game";
import { notifyError } from "@/utils/notify";

export enum MediaPlayerType {
  Admin = "admin",
  Preview = "preview",
  Player = "player",
}

const FILL_MEDIA_STYLE = {
  width: "100%",
  height: "100%",
  "--controls": "none",
} as CSSProperties;

const CONTROL = "h-10 w-10 p-2 shrink-0";

const MediaPlayer: FC<{
  url: string;
  type: MediaPlayerType;
  audio?: boolean;
  idleOverlay?: ReactNode;
}> = memo(function MediaPlayer({ url, type, audio, idleOverlay }) {
  const mediaRef = useRef<HTMLVideoElement>(null);
  const synced = useRef(false);
  const [idle, setIdle] = useState(true);
  const volume = useGameStore((state) =>
    toMediaVolume(type === MediaPlayerType.Admin ? state.settings?.adminVolume : state.settings?.playerVolume)
  );
  const updateMediaPlayer = useCallback((data: EventUpdateMediaPlayer) => {
    const media = mediaRef.current
    if (media) {
      synced.current = true
      if (data.isPlaying) {
        media.play()?.catch(() => undefined)
      } else {
        media.pause()
      }
      media.currentTime = data.time
    }
  }, [mediaRef])

  const applyStoredState = useCallback(() => {
    const stored = useGameStore.getState().media
    if (type !== MediaPlayerType.Player || synced.current || !stored) {
      return
    }
    updateMediaPlayer({ time: mediaPosition(stored), isPlaying: stored.isPlaying })
  }, [type, updateMediaPlayer])

  const syncIdle = useCallback(() => {
    const media = mediaRef.current
    if (media) {
      setIdle(media.paused && media.currentTime === 0)
    }
  }, [mediaRef])

  useEffect(() => {
    eventEmitter.on('updateMediaPlayer', updateMediaPlayer)
    applyStoredState()
    return () => {
      eventEmitter.off('updateMediaPlayer', updateMediaPlayer)
    }
  }, [updateMediaPlayer, applyStoredState])

  const handleUpdate = useCallback(async () => {
    if (!mediaRef.current) return;
    const state = {
      time: mediaRef.current.currentTime,
      isPlaying: !mediaRef.current.paused,
    };
    try {
      await client.updateMediaPlayer(state)
    } catch (error) {
      notifyError(error, 'Не удалось синхронизировать плеер')
    }
  }, [mediaRef])

  if (type === MediaPlayerType.Player) {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <ReactPlayer
          ref={mediaRef}
          slot="media"
          src={url}
          volume={volume}
          controls={false}
          onClick={() => { }}
          onLoadedMetadata={applyStoredState}
          onLoadedData={syncIdle}
          onPlay={syncIdle}
          onPause={syncIdle}
          onSeeked={syncIdle}
          onTimeUpdate={syncIdle}
          style={FILL_MEDIA_STYLE}
        />
        {idleOverlay && idle && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-[56%] max-w-[56%] aspect-square">{idleOverlay}</div>
          </div>
        )}
      </div>
    );
  }

  if (type === MediaPlayerType.Preview) {
    return (
      <div className="relative w-full h-full bg-black">
        <ReactPlayer
          ref={mediaRef}
          src={url}
          volume={volume}
          controls={false}
          muted
          style={FILL_MEDIA_STYLE}
        />
        <div className="absolute inset-0 flex justify-center items-center bg-black/25 pointer-events-none">
          <PlayCircleOutlined className="text-4xl text-white drop-shadow" />
        </div>
      </div>
    );
  }

  return (
    <MediaController
      audio={audio}
      autohide="-1"
      gesturesDisabled
      className={audio ? "block w-full rounded-lg overflow-hidden" : "block w-full h-full"}
    >
      <ReactPlayer
        ref={mediaRef}
        slot="media"
        src={url}
        volume={volume}
        disablePictureInPicture
        controls={false}
        onPlay={handleUpdate}
        onPause={handleUpdate}
        onSeeked={handleUpdate}
        style={FILL_MEDIA_STYLE}
      />
      <MediaControlBar className="flex w-full items-center">
        <MediaPlayButton className={CONTROL} />
        <MediaSeekBackwardButton className={CONTROL} seekOffset={10} />
        <MediaSeekForwardButton className={CONTROL} seekOffset={10} />
        <MediaTimeRange className="h-10 min-w-0 flex-1" />
        <MediaTimeDisplay showDuration className="h-10 shrink-0 px-2 text-sm" />
      </MediaControlBar>
    </MediaController>
  );
});

export default MediaPlayer;
