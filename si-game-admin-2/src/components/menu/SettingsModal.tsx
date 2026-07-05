import { Button, Flex, Modal } from "antd/lib"
import React, { memo, useCallback, useState } from "react"
import { SettingOutlined } from "@ant-design/icons/lib"
import { ChangePointsModal } from "./ChangePointsModal"
import { PlayerSettingsModal } from "./PlayerSettingsModal"
import { useRouter } from "next/router"
import { client } from "@/client"
// import useGameStore from "@/store/game"

// eslint-disable-next-line react/display-name
export const SettingsModal: React.FC<{ forceRefreshCb: () => void }> = memo(({ forceRefreshCb }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const showModal = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  const handleCancel = useCallback(() => {
    setIsModalOpen(false)
    forceRefreshCb()
  }, [forceRefreshCb])

  const handlePreviousRound = useCallback(async () => {
    await client.previousRound()
    setIsModalOpen(false)
  }, [])

  const handleNextRound = useCallback(async () => {
    await client.nextRound()
    setIsModalOpen(false)
  }, [])

  const handleExit = useCallback(async () => {
    await client.exit()
    setIsModalOpen(false)
  }, [])

  return (
    <>
      <Button
        type="primary"
        className="!h-24 !w-24 m-1"
        size="large"
        icon={<SettingOutlined style={{ fontSize: 48 }} onClick={showModal} />}
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
          <Button type="primary" size="large" block onClick={handlePreviousRound}>
            Предыдущий раунд
          </Button>
          <Button type="primary" size="large" block onClick={handleNextRound}>
            Следующий раунд
          </Button>
          <Button type="primary" size="large" block disabled>
            Повторить вопрос
          </Button>
          <Button type="primary" size="large" block disabled>
            Отменить вопрос
          </Button>
          <ChangePointsModal />
          <PlayerSettingsModal />
          <Button type="primary" size="large" block disabled>
            Настройки
          </Button>
          <Button type="primary" size="large" block onClick={handleExit}>
            Выход
          </Button>
        </Flex>
      </Modal>
    </>
  )
})
