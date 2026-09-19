import { Button, Divider, Flex, Modal } from "antd";
import React, { memo, useCallback } from "react";
import { PlayerInSetting } from "./PlayerInSetting";
import { client } from "@/client";
import { useGameStore } from "@/store/game";
import { notifyError } from "@/utils/notify";

export const PlayerSettingsModal: React.FC<{ open: boolean; onBack: () => void }> = memo(function PlayerSettingsModal({ open, onBack }) {
  const players = useGameStore(state => state.players)

  const onDeletePlayer = useCallback((playerId: string) => async () => {
    try {
      await client.removePlayer(playerId)
    } catch (error) {
      notifyError(error, 'Не удалось удалить игрока')
    }
  }, [])

  const onNewPlayer = useCallback(async () => {
    try {
      await client.addPlayer()
    } catch (error) {
      notifyError(error, 'Не удалось добавить игрока')
    }
  }, [])

  const onChangeName = useCallback((playerId: string) => async (name: string) => {
    try {
      const player = useGameStore.getState().players.find(p => p.id === playerId)
      await client.updatePlayer(playerId, name, player?.keyboardKey)
    } catch (error) {
      notifyError(error, 'Не удалось переименовать игрока')
    }
  }, [])

  const onChangeKey = useCallback((playerId: string) => async (code: string) => {
    try {
      const player = useGameStore.getState().players.find(p => p.id === playerId)
      await client.updatePlayer(playerId, player?.name ?? '', code)
    } catch (error) {
      notifyError(error, 'Не удалось назначить кнопку')
    }
  }, [])

  return (
    <>
      <Modal
        title="Настройка игроков"
        width={560}
        open={open}
        onCancel={onBack}
        footer={[
          <Button block key="back" size="large" onClick={onBack}>
            Назад
          </Button>
        ]}
      >
        <Flex vertical gap="small" className="w-full">
          <Button block type="primary"
            onClick={onNewPlayer}
          >
            Добавить игрока
          </Button>
          <Divider className="!my-2" />
          {
            players.map(player => (
              <PlayerInSetting
                key={player.id}
                onChangeName={onChangeName(player.id)}
                onChangeKey={onChangeKey(player.id)}
                onDelete={onDeletePlayer(player.id)}
                name={player.name}
                keyboardKey={player.keyboardKey}
              />
            ))
          }
        </Flex>
      </Modal>
    </>
  );
}
);
