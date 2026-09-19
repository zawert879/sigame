import { Button } from "antd";
import React, { useCallback, useState } from "react";
import { Progress, type ProgressValue } from "../Progress";
import { SendOutlined } from "@ant-design/icons";
import { SettingsModal } from "./SettingsModal";
import { client } from "@/client";
import { Screen } from "@/data";
import { useGameStore } from "@/store/game";
import { notifyError } from "@/utils/notify";
import { screenTitle } from "@/utils/screens";

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
    <header className="sticky top-0 z-30 bg-blue-950 text-white shadow-md">
      <div className="mx-auto flex items-center gap-2 px-2 py-2 sm:gap-4 sm:px-4">
        <SettingsModal refresh={refresh} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="m-0 text-center text-base font-bold leading-5 text-yellow-300 sm:text-lg">{screenTitle(screen)}</h1>
          <Progress game={game} round={round} question={question} />
        </div>
        <Button
          type="primary"
          size="large"
          aria-label="Далее"
          title="Далее"
          className="!h-12 !w-12 shrink-0 sm:!h-14 sm:!w-14"
          onClick={onNext}
          icon={<SendOutlined spin={isSpin} className="text-2xl sm:text-3xl" />}
        />
      </div>
    </header>
  )
};
