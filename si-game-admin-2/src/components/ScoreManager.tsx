import { client } from "@/client"
import { Button, Space } from "antd/lib"
import { FC, useCallback, useEffect, useState } from "react"
import * as Data from "@/data"
import { EventUpdateScoreValue } from "@/types"
import _ from 'lodash'
import { InputNumber } from "./override/InputNumber"

export const ScoreManager: FC<{ defaultScore: number, big: number, little: number }> = ({ defaultScore, big, little }) => {
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

  const onBigPlus = useCallback(async () => {
    await client.submitScoreBigPlus()
  }, [])
  const onBigMinus = useCallback(async () => {
    await client.submitScoreBigMinus()
  }, [])
  const onLittlePlus = useCallback(async () => {
    await client.submitScoreLittlePlus()
  }, [])
  const onLittleMinus = useCallback(async () => {
    await client.submitScoreLittleMinus()
  }, [])
  const onChange = useCallback(async (value: any) => {
    await client.setScoreValue(value)
  }, [])

  return (
    <>
      <Space.Compact block>
        <Button
          type="primary"
          block
          size="large"
          onClick={onLittleMinus}
        >
          {`-${little}`}
        </Button>
        <Button
          type="primary"
          block
          size="large"
          onClick={onBigMinus}
        >
          {`-${big}`}
        </Button>
        <InputNumber
          value={scoreValue}
          size="large"
          className="!w-full"
          onChange={_.debounce(onChange, 450)}
        />
        <Button
          type="primary"
          block
          size="large"
          onClick={onBigPlus}
        >
          {`+${big}`}
        </Button>
        <Button
          type="primary"
          block
          size="large"
          onClick={onLittlePlus}
        >
          {`+${little}`}
        </Button>
      </Space.Compact>
    </>
  );
};
