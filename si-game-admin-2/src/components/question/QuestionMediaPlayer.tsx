import { FC } from "react"
import { Button, Slider } from "antd/lib"
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons/lib"

export interface QuestionMediaPlayerProps {
  duration: number
  isPlayIcon: boolean
  playerSliderValue: number
  reset: () => void
  playPause: () => void
  setCurrentTime: (value: number) => void
}
export const QuestionMediaPlayer: FC<QuestionMediaPlayerProps> = ({
  duration,
  playerSliderValue,
  isPlayIcon,
  playPause,
  reset,
  setCurrentTime
}) => {
  return (
    <div className="h-[70px] w-full border-t-2 border-t-white flex items-center px-2">
      <Slider
        className="grow mr-4"
        max={duration}
        step={0.25}
        value={playerSliderValue}
        onChange={(value: number) => {
          setCurrentTime(value)
        }}
      />
      <Button
        type="primary"
        size="large"
        className="!h-14 !w-14 !mr-2 "
        onClick={reset}
        icon={<ReloadOutlined style={{ fontSize: 40 }} />}
      />
      <Button
        type="primary"
        size="large"
        className="!h-14 !w-14 "
        onClick={playPause}
        icon={
          isPlayIcon ? (
            <PlayCircleOutlined style={{ fontSize: 40 }} />
          ) : (
            <PauseCircleOutlined style={{ fontSize: 40 }} />
          )
        }
      />
    </div>
  )
}
