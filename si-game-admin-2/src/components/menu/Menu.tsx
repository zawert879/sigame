import { Button, Flex } from "antd";
import React, { useCallback, useState } from "react";
import { Progress, type ProgressValue } from "../Progress";
import { SendOutlined } from "@ant-design/icons";
import { SettingsModal } from "./SettingsModal";
import { client } from "@/client";
import { Screen } from "@/data";
import { useGameStore } from "@/store/game";
import { notifyError } from "@/utils/notify";

const EMPTY: ProgressValue = { value: 0, total: 0 };

export const Menu: React.FC<{ refresh: () => void }> = ({ refresh }) => {
  const [isSpin, setIsSpin] = useState(false)
  const progress = useGameStore(state => state.progress)
  const screen = useGameStore(state => state.screen)
  const questionPage = useGameStore(state => state.questionPage)

  const onNext = useCallback(async () => {
    setIsSpin(true)
    try {
      await client.next()
    } catch (error) {
      notifyError(error, 'Не удалось перейти дальше')
    } finally {
      setIsSpin(false)
    }
  }, [])

  const game: ProgressValue = progress ? { value: progress.roundIndex + 1, total: progress.roundsCount } : EMPTY
  const round: ProgressValue = progress ? { value: progress.questionsPlayed, total: progress.questionsTotal } : EMPTY
  const question: ProgressValue = screen === Screen.Question && questionPage && questionPage.pagesCount > 0
    ? { value: questionPage.pageIndex + 1, total: questionPage.pagesCount }
    : EMPTY

  return (
    <Flex>
      <SettingsModal refresh={refresh} />
      <Progress game={game} round={round} question={question} />
      <Button type="primary" className="!h-24 !w-24 m-1" size="large" onClick={onNext} icon={<SendOutlined spin={isSpin} style={{ fontSize: 48 }} />} />
    </Flex>
  )
};
