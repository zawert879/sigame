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
  MediaMuteButton,
} from "media-chrome/react";
import { PlayCircleOutlined } from "@ant-design/icons";
import ReactPlayer from "react-player";
import { client } from "@/client";
import { eventEmitter } from "@/eventEmitter";
import { EventUpdateMediaPlayer } from "@/types";
import { isFreshMedia, mediaPosition, toMediaVolume, useGameStore } from "@/store/game";
import { useAudioStore } from "@/store/audio";
import { isAutoplayBlocked } from "@/utils/autoplay";
import { notifyError } from "@/utils/notify";
import { UNLOCK_SOUND_EVENT } from "./SoundUnlock";

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

const SYNC_TOLERANCE_S = 1;

const FRESH_START: EventUpdateMediaPlayer = { time: 0, isPlaying: true };

const MediaPlayer: FC<{
  url: string;
  type: MediaPlayerType;
  audio?: boolean;
  idleOverlay?: ReactNode;
}> = memo(function MediaPlayer({ url, type, audio, idleOverlay }) {
  const mediaRef = useRef<HTMLVideoElement>(null);
  const mountedAtRef = useRef(Date.now());
  const autoMutedRef = useRef(false);
  const blockedRef = useRef(false);
  const startedRef = useRef(false);
  const [idle, setIdle] = useState(true);
  const isAdmin = type === MediaPlayerType.Admin;
  const isSynced = type !== MediaPlayerType.Preview;
  const adminMuted = useAudioStore((state) => state.adminMuted);
  const volume = useGameStore((state) =>
    toMediaVolume(isAdmin ? state.settings?.adminVolume : state.settings?.playerVolume)
  );

  const expected = useCallback((): EventUpdateMediaPlayer => {
    const stored = useGameStore.getState().media;
    return stored
      ? { time: mediaPosition(stored), isPlaying: stored.isPlaying }
      : { time: (Date.now() - mountedAtRef.current) / 1000, isPlaying: true };
  }, []);

  const play = useCallback((media: HTMLMediaElement) => {
    const started = () => {
      blockedRef.current = false;
    };
    media.play().then(started, (error: unknown) => {
      if (!isAutoplayBlocked(error)) {
        return;
      }
      blockedRef.current = true;
      useAudioStore.getState().setSoundLocked(true);
      if (media.muted) {
        return;
      }
      autoMutedRef.current = true;
      media.muted = true;
      media.play().then(started, () => undefined);
    });
  }, []);

  const apply = useCallback((target: EventUpdateMediaPlayer, seek: boolean) => {
    const media = mediaRef.current;
    if (!media) {
      return;
    }
    if (seek && Math.abs(media.currentTime - target.time) > SYNC_TOLERANCE_S) {
      media.currentTime = target.time;
    }
    const finished = Number.isFinite(media.duration) && target.time >= media.duration;
    if (target.isPlaying && media.paused && !finished) {
      play(media);
    } else if (!target.isPlaying && !media.paused) {
      media.pause();
    }
  }, [play]);

  const applyInitial = useCallback(() => {
    if (!isSynced) {
      return;
    }
    if (isFreshMedia(useGameStore.getState().media)) {
      apply(FRESH_START, false);
    } else {
      apply(expected(), true);
    }
  }, [apply, expected, isSynced]);

  const syncIdle = useCallback(() => {
    const media = mediaRef.current;
    if (media) {
      setIdle(media.paused && media.currentTime === 0);
    }
  }, []);

  useEffect(() => {
    if (!isSynced) {
      return;
    }
    const follow = () => apply(expected(), true);
    const unlock = () => {
      const media = mediaRef.current;
      if (!media || (!autoMutedRef.current && !blockedRef.current)) {
        return;
      }
      if (autoMutedRef.current) {
        autoMutedRef.current = false;
        media.muted = isAdmin && useAudioStore.getState().adminMuted;
      }
      apply(expected(), true);
    };
    eventEmitter.on("updateMediaPlayer", follow);
    eventEmitter.on(UNLOCK_SOUND_EVENT, unlock);
    applyInitial();
    return () => {
      eventEmitter.off("updateMediaPlayer", follow);
      eventEmitter.off(UNLOCK_SOUND_EVENT, unlock);
    };
  }, [apply, applyInitial, expected, isAdmin, isSynced]);

  const report = useCallback(async () => {
    const media = mediaRef.current;
    if (!media) {
      return;
    }
    if (media.ended) {
      return;
    }
    const state = { time: media.currentTime, isPlaying: !media.paused };
    const target = expected();
    if (blockedRef.current) {
      if (!state.isPlaying) {
        return;
      }
      blockedRef.current = false;
      if (target.isPlaying) {
        if (Math.abs(state.time - target.time) > SYNC_TOLERANCE_S) {
          media.currentTime = target.time;
        }
        return;
      }
    }
    const firstStart = state.isPlaying && !startedRef.current;
    if (state.isPlaying) {
      startedRef.current = true;
    }
    const startsFresh = firstStart && isFreshMedia(useGameStore.getState().media) && state.time <= SYNC_TOLERANCE_S;
    const inSync = state.isPlaying === target.isPlaying && Math.abs(state.time - target.time) <= SYNC_TOLERANCE_S;
    if (startsFresh || inSync) {
      return;
    }
    useGameStore.getState().setMedia(state);
    try {
      await client.updateMediaPlayer(state);
    } catch (error) {
      notifyError(error, "Не удалось синхронизировать плеер");
    }
  }, [expected]);

  const rememberMuted = useCallback(() => {
    const media = mediaRef.current;
    if (!media || (autoMutedRef.current && media.muted)) {
      return;
    }
    autoMutedRef.current = false;
    useAudioStore.getState().setAdminMuted(media.muted);
  }, []);

  if (type === MediaPlayerType.Player) {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <ReactPlayer
          ref={mediaRef}
          slot="media"
          src={url}
          volume={volume}
          controls={false}
          preload="auto"
          playsInline
          onClick={() => { }}
          onLoadedMetadata={applyInitial}
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
          preload="metadata"
          playsInline
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
        muted={adminMuted}
        disablePictureInPicture
        controls={false}
        preload="auto"
        playsInline
        onLoadedMetadata={applyInitial}
        onPlay={report}
        onPause={report}
        onSeeked={report}
        onVolumeChange={rememberMuted}
        style={FILL_MEDIA_STYLE}
      />
      <MediaControlBar className="flex w-full items-center">
        <MediaPlayButton className={CONTROL} />
        <MediaSeekBackwardButton className={CONTROL} seekOffset={10} />
        <MediaSeekForwardButton className={CONTROL} seekOffset={10} />
        <MediaTimeRange className="h-10 min-w-0 flex-1" />
        <MediaTimeDisplay showDuration className="h-10 shrink-0 px-2 text-sm" />
        <MediaMuteButton className={CONTROL} />
      </MediaControlBar>
    </MediaController>
  );
});

export default MediaPlayer;
