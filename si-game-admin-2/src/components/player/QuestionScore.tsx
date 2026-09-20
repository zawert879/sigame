import { FC } from "react";
import { Screen } from "@/data";
import { useGameStore } from "@/store/game";

const PRICE_SCREENS = new Set([Screen.Question, Screen.QuestionPreparation])

const QuestionScore: FC = () => {
  const scoreValue = useGameStore(state => PRICE_SCREENS.has(state.screen as Screen) ? state.scoreValue : null)

  return (<div className="flex justify-center text-white text-xl border-b-2">
    {scoreValue ?? "\u00A0"}
  </div>
  )
}

export default QuestionScore;
