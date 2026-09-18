import { Button, Flex, Modal } from "antd"
import React, { memo, useCallback, useState } from "react"
import { SettingOutlined } from "@ant-design/icons"
import { ChangePointsModal } from "./ChangePointsModal"
import { PlayerSettingsModal } from "./PlayerSettingsModal"
import { client } from "@/client"
import { Screen } from "@/data"
import { useGameStore } from "@/store/game"
import { notifyError } from "@/utils/notify"

// eslint-disable-next-line react/display-name
export const SettingsModal: React.FC<{ refresh: () => void }> = memo(({ refresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pending, setPending] = useState<string | null>(null)
  const screen = useGameStore(state => state.screen)
  const canRepeat = screen === Screen.Question
  const canCancel = screen === Screen.Question || screen === Screen.QuestionPreparation

  const showModal = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  const handleCancel = useCallback(() => {
    setIsModalOpen(false)
    refresh()
  }, [refresh])

  // runs a menu action; the menu closes on success, a failure is shown and the menu stays open
  const runAction = useCallback(async (key: string, errorTitle: string, action: () => Promise<void>) => {
    setPending(key)
    try {
      await action()
      setIsModalOpen(false)
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
      // The admin media player follows no pushes: restart it locally. It remounts paused at the start, as when the
      // question was opened, while the server restarts the media playing — the admin player is the source of the
      // media controls, so send its state and the player screen stops at the start too.
      useGameStore.getState().restartQuestionMedia()
      client.updateMediaPlayer({ time: 0, isPlaying: false })
        .catch(error => notifyError(error, 'Не удалось синхронизировать плеер'))
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
        className="!h-24 !w-24 m-1"
        size="large"
        aria-label="Меню"
        onClick={showModal}
        icon={<SettingOutlined style={{ fontSize: 48 }} />}
      />
      <Modal
        title="Меню"
        open={isModalOpen}
        onCancel={handleCancel}
        footer={[
          <Button block key="back" size="large" onClick={handleCancel}>
            Назад
          </Button>,
        ]}
      >
        <Flex vertical gap="small" className="w-full">
          <Button type="primary" size="large" block loading={pending === 'previousRound'} onClick={handlePreviousRound}>
            Предыдущий раунд
          </Button>
          <Button type="primary" size="large" block loading={pending === 'nextRound'} onClick={handleNextRound}>
            Следующий раунд
          </Button>
          <Button type="primary" size="large" block disabled={!canRepeat} loading={pending === 'repeatQuestion'} onClick={handleRepeatQuestion}>
            Повторить вопрос
          </Button>
          <Button type="primary" size="large" block disabled={!canCancel} loading={pending === 'cancelQuestion'} onClick={handleCancelQuestion}>
            Отменить вопрос
          </Button>
          <ChangePointsModal />
          <PlayerSettingsModal />
          <Button type="primary" size="large" block loading={pending === 'exit'} onClick={handleExit}>
            Выход
          </Button>
        </Flex>
      </Modal>
    </>
  )
})
