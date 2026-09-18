import { client } from "@/client"
import { Button, Space } from "antd"
import { FC, useCallback } from "react"
import { InputNumber } from "./override/InputNumber"
import { useGameStore } from "@/store/game"
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback"
import { notifyError } from "@/utils/notify"

export const ScoreManager: FC = () => {
  const scoreValue = useGameStore(state => state.scoreValue)
  const big = useGameStore(state => state.settings?.big ?? state.meta?.scoreBig ?? 0)
  const little = useGameStore(state => state.settings?.little ?? state.meta?.scoreLittle ?? 0)

  const run = useCallback(async (request: () => Promise<void>) => {
    try {
      await request()
    } catch (error) {
      notifyError(error, 'Не удалось изменить цену вопроса')
    }
  }, [])

  const onBigPlus = useCallback(() => run(() => client.submitScoreBigPlus()), [run])
  const onBigMinus = useCallback(() => run(() => client.submitScoreBigMinus()), [run])
  const onLittlePlus = useCallback(() => run(() => client.submitScoreLittlePlus()), [run])
  const onLittleMinus = useCallback(() => run(() => client.submitScoreLittleMinus()), [run])
  const onChange = useDebouncedCallback((value: number | string | null) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return run(() => client.setScoreValue(value))
    }
  }, 450)

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
          onChange={onChange}
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
