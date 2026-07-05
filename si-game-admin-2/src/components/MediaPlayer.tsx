// src/components/MediaPlayer.tsx

"use client";
import { FC, memo, useCallback, useEffect, useRef, useState } from "react";
import {
  MediaController,
  MediaControlBar,
  MediaTimeRange,
  MediaTimeDisplay,
  MediaVolumeRange,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaMuteButton,
} from "media-chrome/react";
import { PlayCircleOutlined } from "@ant-design/icons/lib";
import ReactPlayer from "react-player";
import { client } from "@/client";
import { eventEmitter } from "@/eventEmitter";
import { EventUpdateMediaPlayer } from "@/types";

export enum MediaPlayerType {
  Admin = "admin",
  Preview = "preview",
  Player = "player",
}
const MediaPlayer: FC<{
  url: string;
  type: MediaPlayerType;
  // eslint-disable-next-line react/display-name
}> = memo(({ url, type }) => {
  const mediaRef = useRef<HTMLVideoElement>(null);
  const updateMediaPlayer = useCallback((data: EventUpdateMediaPlayer) => {
    if(mediaRef.current){
      console.log(data)
      data.isPlaying ? mediaRef.current.play() : mediaRef.current.pause()
      mediaRef.current.currentTime = data.time
    }
  }, [mediaRef])

  useEffect(() => {
    eventEmitter.on('updateMediaPlayer', updateMediaPlayer)
    return () => {
      eventEmitter.off('updateMediaPlayer', updateMediaPlayer)
    }
  }, [updateMediaPlayer])

  const handleUpdate = useCallback(async () => {
    if (!mediaRef.current) return;
    const state = {
      time: mediaRef.current.currentTime,
      isPlaying: !mediaRef.current.paused,
    };
    await client.updateMediaPlayer(state)
  }, [mediaRef])

  const handlePlayPause = useCallback(() => {
    mediaRef.current && handleUpdate();
  }, [handleUpdate, mediaRef])

  const handleSeekMouseUp = useCallback(() => {
    mediaRef.current && handleUpdate();
  }, [handleUpdate, mediaRef]);

  const handleClickToButtons = useCallback(() => {
    mediaRef.current && handleUpdate();
  }, [handleUpdate, mediaRef]);

  if (type === MediaPlayerType.Preview || type === MediaPlayerType.Player) {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <ReactPlayer
          ref={mediaRef}
          slot="media"
          src={url}
          controls={false}
          onClick={() => { }}
          style={{
            width: "100%",
            height: "100%",
            // @ts-ignore
            "--controls": "none",
          }}
        />
        {type === MediaPlayerType.Preview && (
          <div
            className="w-full h-full absolute flex justify-center items-center bg-black/25"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 2,
            }}
          >
            <PlayCircleOutlined
              style={{
                fontSize: 100,
                filter: "invert(1) drop-shadow(0 0 8px #000)",
              }}
            />
          </div>
        )}
      </div>
    );
  }
  return (
    <MediaController
      autohide="-1"
      gesturesDisabled
      style={{
        height: "100%",
        width: "100%",
        aspectRatio: "16/9",
      }}
    >
      <ReactPlayer
        ref={mediaRef}
        slot="media"
        src={url}
        disablePictureInPicture
        config={{
          //@ts-ignore
          file: {
            attributes: {
              controlsList: "nofullscreen",
            },
          },
        }}
        fullscreen={false}
        controls={false}
        onPlay={handlePlayPause}
        onPause={handlePlayPause}
        style={{
          width: "100%",
          height: "100%",
          // @ts-ignore
          "--controls": "none",
        }}
      ></ReactPlayer>
      <MediaControlBar className="flex items-center  p-2">
        {/* <MediaVolumeRange className="h-4" /> */}
        {/* <MediaMuteButton className="w-12 h-12 text-2xl" /> */}

        <MediaTimeDisplay showDuration className="text-lg" />

        <MediaSeekBackwardButton
          className="w-12 h-12 text-2xl"
          seekOffset={10}
          onClick={handleClickToButtons}
        />
        <MediaSeekForwardButton
          className="w-12 h-12 text-2xl"
          seekOffset={10}
          onClick={handleClickToButtons}
        />

        <MediaTimeRange
          className="h-4 flex-1"
          onMouseUp={handleSeekMouseUp}
        />
        <MediaPlayButton className="w-12 h-12 text-2xl" />
      </MediaControlBar>
    </MediaController>
  );
});

export default MediaPlayer;
