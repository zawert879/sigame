import { FC } from "react";
import { useGameStore } from "@/store/game";

const QuestionScore: FC = () => {
  const scoreValue = useGameStore(state => state.scoreValue)

  return (<div className="flex justify-center text-white text-xl border-b-2">
    {scoreValue}
  </div>
  )
}

export default QuestionScore;
