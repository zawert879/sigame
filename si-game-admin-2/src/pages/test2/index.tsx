import { Games } from "@/components/Games"
import { SoundType, useSound } from "@/hooks/useSound"
import { Button } from "antd/lib"
import { FC } from "react"

const Test: FC = () => {
  const q = useSound()
  return (<>
    {/* <div className="bg-blue-700 h-[92vh] lg:h-[100vh] flex flex-col justify-center items-center w-screen">
      <Games />
    </div> */}

    <Button danger onClick={() => q.playSound(SoundType.FinalDelete)} >FinalDelete</Button>
    <Button danger onClick={() => q.playSound(SoundType.FinalThink)} >FinalThink</Button>
    <Button danger onClick={() => q.playSound(SoundType.GameBegin)} >GameBegin</Button>
    <Button danger onClick={() => q.playSound(SoundType.QuestionNoanswers)} >QuestionNoanswers</Button>
    <Button danger onClick={() => q.playSound(SoundType.QuestionNorisk)} >QuestionNorisk</Button>
    <Button danger onClick={() => q.playSound(SoundType.QuestionSecret)} >QuestionSecret</Button>
    <Button danger onClick={() => q.playSound(SoundType.QuestionStake)} >QuestionStake</Button>
    <Button danger onClick={() => q.playSound(SoundType.RoundBegin)} >RoundBegin</Button>
    <Button danger onClick={() => q.playSound(SoundType.RoundThemes)} >RoundThemes</Button>
    <Button danger onClick={() => q.playSound(SoundType.RoundTimeout)} >RoundTimeout</Button>
  </>)
}

export default Test