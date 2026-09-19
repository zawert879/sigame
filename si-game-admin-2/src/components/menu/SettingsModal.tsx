import { Button, Flex, Modal } from "antd"
import React, { memo, useCallback, useState } from "react"
import { SettingOutlined } from "@ant-design/icons"
import { ChangePointsModal } from "./ChangePointsModal"
import { PlayerSettingsModal } from "./PlayerSettingsModal"
import { client } from "@/client"
import { Screen } from "@/data"
import { useGameStore } from "@/store/game"
import { notifyError } from "@/utils/notify"

export const SettingsModal: React.FC<{ refresh: () => void }> = memo(function SettingsModal({ refresh }) {
  const [view, setView] = useState<'menu' | 'points' | 'players' | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const screen = useGameStore(state => state.screen)
  const roundIndex = useGameStore(state => state.progress?.roundIndex ?? 0)
  const roundsCount = useGameStore(state => state.progress?.roundsCount ?? 0)
  const hasPreviousRound = roundsCount > 0 && roundIndex > 0
  const hasNextRound = roundIndex < roundsCount - 1
  const roundCaption = roundsCount > 0 ? `Раунд ${roundIndex + 1} из ${roundsCount}` : "Пак не выбран"
  const canRepeat = screen === Screen.Question
  const canCancel = screen === Screen.Question || screen === Screen.QuestionPreparation

  const showModal = useCallback(() => {
    setView('menu')
  }, [])

  const showPoints = useCallback(() => {
    setView('points')
  }, [])

  const showPlayers = useCallback(() => {
    setView('players')
  }, [])

  const handleCancel = useCallback(() => {
    setView(null)
    refresh()
  }, [refresh])

  const runAction = useCallback(async (key: string, errorTitle: string, action: () => Promise<void>) => {
    setPending(key)
    try {
      await action()
      setView(null)
    } catch (error) {
      notifyError(error, errorTitle)
    } finally {
      setPending(null)
    }
  }, [])

  const handlePreviousRound = useCallback(
    () => runAction('previousRound', 'Не удалось перейти к предыдущему раунду', () => client.previousRound()),
    [runAction],
  )

  const handleNextRound = useCallback(
    () => runAction('nextRound', 'Не удалось перейти к следующему раунду', () => client.nextRound()),
    [runAction],
  )

  const handleRepeatQuestion = useCallback(
    () => runAction('repeatQuestion', 'Не удалось повторить вопрос', async () => {
      await client.repeatQuestion()
      useGameStore.getState().restartQuestionMedia()
    }),
    [runAction],
  )

  const handleCancelQuestion = useCallback(
    () => runAction('cancelQuestion', 'Не удалось отменить вопрос', () => client.cancelQuestion()),
    [runAction],
  )

  const handleExit = useCallback(
    () => runAction('exit', 'Не удалось выйти из игры', () => client.exit()),
    [runAction],
  )

  return (
    <>
      <Button
        type="primary"
        className="!h-12 !w-12 shrink-0 sm:!h-14 sm:!w-14"
        size="large"
        aria-label="Меню"
        title="Меню"
        onClick={showModal}
        icon={<SettingOutlined className="text-2xl sm:text-3xl" />}
      />
      <Modal
        title="Меню"
        width={440}
        open={view === 'menu'}
        onCancel={handleCancel}
        footer={[
          <Button block key="back" size="large" onClick={handleCancel}>
            Назад
          </Button>,
        ]}
      >
        <Flex vertical gap="small" className="w-full">
          <div className="text-center text-sm text-slate-500">{roundCaption}</div>
          <Button
            type="primary"
            size="large"
            block
            disabled={!hasPreviousRound}
            title={hasPreviousRound ? undefined : roundsCount > 0 ? "Это первый раунд" : roundCaption}
            loading={pending === 'previousRound'}
            onClick={handlePreviousRound}
          >
            Предыдущий раунд
          </Button>
          <Button
            type="primary"
            size="large"
            block
            disabled={!hasNextRound}
            title={hasNextRound ? undefined : roundsCount > 0 ? "Это последний раунд" : roundCaption}
            loading={pending === 'nextRound'}
            onClick={handleNextRound}
          >
            Следующий раунд
          </Button>
          <Button type="primary" size="large" block disabled={!canRepeat} loading={pending === 'repeatQuestion'} onClick={handleRepeatQuestion}>
            Повторить вопрос
          </Button>
          <Button type="primary" size="large" block disabled={!canCancel} loading={pending === 'cancelQuestion'} onClick={handleCancelQuestion}>
            Отменить вопрос
          </Button>
          <Button type="primary" size="large" block onClick={showPoints}>
            Настройки
          </Button>
          <Button type="primary" size="large" block onClick={showPlayers}>
            Настройка игроков
          </Button>
          <Button type="primary" size="large" block loading={pending === 'exit'} onClick={handleExit}>
            Выход
          </Button>
        </Flex>
      </Modal>
      <ChangePointsModal open={view === 'points'} onBack={showModal} />
      <PlayerSettingsModal open={view === 'players'} onBack={showModal} />
    </>
  )
})
