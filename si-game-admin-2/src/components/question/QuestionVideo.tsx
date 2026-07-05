import { FC, ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { QuestionMediaPlayer } from "./QuestionMediaPlayer"
import {
  PlayCircleOutlined
} from "@ant-design/icons/lib"

export const QuestionVideo: FC<{ url: string; isPreview?: boolean; isAdminButtons?: boolean }> = ({
  url,
  isPreview,
  isAdminButtons
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [sliderValue, setSliderValue] = useState(0)
  const [isPlayIcon, setIsPlayIcon] = useState<boolean>(true)

  const playPause = useCallback(() => {
    setIsPlayIcon(!isPlayIcon)
    if (videoRef.current) {
      isPlayIcon ? videoRef.current.play() : videoRef.current.pause()
    }
  }, [isPlayIcon])

  const setCurrentTime = useCallback(
    (value: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = value
      }
    },
    []
  )

  const reset = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
    }
  }, [])

  useEffect(() => {
    const ev = (event: any) => {
      if (videoRef.current) {
        setSliderValue(videoRef.current.currentTime)
      }
    }

    videoRef.current?.addEventListener("timeupdate", ev)
    return () => {
      videoRef.current?.removeEventListener("timeupdate", ev)
    }
  }, [])

  return (
    <>
      {isPreview && (
        <div className="relative h-full w-full">
          <video className="absolute h-full w-full" src={url} preload="metadata" />
          <div className="w-full h-full absolute flex justify-center items-center bg-black/25"><PlayCircleOutlined style={{ fontSize: 100 }} /></div>
        </div>
      )}
      {!isPreview && (
        <div className="h-[400px] w-full">
          <div className="relative h-[330px] w-full">
            <video
              className="absolute w-full h-full"
              src={url}
              ref={videoRef}
              preload="auto"
            />
            <div className="w-full h-full absolute flex justify-center items-center"></div>
          </div>
          {(!isPreview && !!isAdminButtons) && (<QuestionMediaPlayer
            duration={videoRef.current?.duration ?? 0}
            isPlayIcon={isPlayIcon}
            playPause={playPause}
            reset={reset}
            playerSliderValue={sliderValue}
            setCurrentTime={setCurrentTime}
          />
          )}
        </div>
      )}
    </>
  )
}
