import { client } from "@/client";
import { FC, useCallback, useEffect, useState } from "react";
import * as Data from "@/data"
import { EventUpdateScoreValue } from "@/types";

const QuestionScore: FC<{ defaultScore: number }> = ({ defaultScore }) => {
  const [scoreValue, setScoreValue] = useState(defaultScore)
  const onUpdateScoreValue = useCallback((data: EventUpdateScoreValue) => {
    setScoreValue(data.scoreValue);
  }, [])
  useEffect(() => {
    client.socket.socketIo.on(Data.Event.OnUpdateScoreValue, onUpdateScoreValue)

    return () => {
      client.socket.socketIo.off(Data.Event.OnUpdateScoreValue, onUpdateScoreValue)
    }
  }, [onUpdateScoreValue])

  return (<div className="flex justify-center text-white text-xl border-b-2">
    {scoreValue}
  </div>
  )
}

export default QuestionScore;