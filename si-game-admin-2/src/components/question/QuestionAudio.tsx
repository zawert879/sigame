import { FC, ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { QuestionMediaPlayer } from "./QuestionMediaPlayer"

export const QuestionAudio: FC<{
  url: string
  isPreview?: boolean
  isAdmin?: boolean
}> = ({ url, isPreview, isAdmin }) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [sliderValue, setSliderValue] = useState(0)
  const [isPlayIcon, setIsPlayIcon] = useState<boolean>(true)

  const playPause = useCallback(() => {
    setIsPlayIcon(!isPlayIcon)
    if (audioRef.current) {
      isPlayIcon ? audioRef.current.play() : audioRef.current.pause()
    }
  }, [isPlayIcon])

  const setCurrentTime = useCallback(
    (value: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = value
      }
    },
    [audioRef.current]
  )

  const reset = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
    }
  }, [])

  useEffect(() => {
    const ev = (event: any) => {
      if (audioRef.current) {
        setSliderValue(audioRef.current.currentTime)
      }
    }
    audioRef.current?.addEventListener("timeupdate", ev)

    return () => {
      audioRef.current?.removeEventListener("timeupdate", ev)
    }
  }, [])
  
  return (
    <div className="h-[100px] w-full ">
      <div className="relative h-[30px] w-full bg-green-500">
        <audio
          className="absolute w-full h-full"
          src={url}
          ref={audioRef}
          preload="auto"
        />
        <div className="w-full h-full absolute flex justify-center items-center">
          AUDIO
        </div>
      </div>
      {(!isPreview && !!isAdmin) && (
        <QuestionMediaPlayer
          duration={audioRef.current?.duration ?? 0}
          isPlayIcon={isPlayIcon}
          playPause={playPause}
          reset={reset}
          playerSliderValue={sliderValue}
          setCurrentTime={setCurrentTime}
        />
      )}
    </div>
  )
}
