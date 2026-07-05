import { Button, Divider, Flex, Modal } from "antd/lib";
import React, { memo, useCallback, useEffect, useState } from "react";
import { PlayerInSetting } from "./PlayerInSetting";
import { nanoid } from "nanoid";
import { EventUpdatePlayers, ResponseGetPlayers } from "@/types";
import { client } from "@/client";
import { Event } from "@/data";

// eslint-disable-next-line react/display-name
export const PlayerSettingsModal: React.FC = memo(() => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [players, setPlayers] = useState<ResponseGetPlayers>([])

  const showModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
  }, []);


  const onUpdatePlayer = useCallback((data: EventUpdatePlayers) => {
    let buff = [...players]
    for (const player of data.added) {
      buff.push(player)
    }

    buff = buff.filter(player => {
      return !data.removed.includes(player.id)
    })

    for (const player of data.updated) {
      const found = buff.find(p => p.id === player.id)
      if (found) {
        found.keyboardKey = player.keyboardKey
        found.name = player.name
      }
    }

    setPlayers(buff)
  }, [players])

  useEffect(() => {
    client.socket.socketIo.on(Event.OnUpdatePlayers, onUpdatePlayer)

    return () => {
      client.socket.socketIo.off(Event.OnUpdatePlayers, onUpdatePlayer)
    }
  }, [onUpdatePlayer])

  useEffect(() => {
    const fetch = async () => {
      setPlayers(await client.getPlayers())
    }
    fetch()
  }, [])

  const onDeletePlayer = useCallback((playerId: string) => async () => {
    await client.removePlayer(playerId)
  }, [])

  const onNewPlayer = useCallback(async () => {
    await client.addPlayer()
  }, [])

  const onChangeName = useCallback((playerId: string) => async (name: string) => {
    await client.updatePlayer(playerId, name, undefined)
  }, [])



  return (
    <>
      <Button type="primary" size="large" block onClick={showModal}>
        Настройка игроков
      </Button>
      <Modal
        title="Настройка игроков"
        open={isModalOpen}
        onCancel={handleCancel}
        afterOpenChange={(open) => {
          if (!open) {
            // setLocalPlayers(players)
          }
        }}
        footer={[
          <Button block key="back" onClick={handleCancel}>
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
          <Divider />
          {
            players.map(player => (
              <PlayerInSetting key={player.id} onChangeName={onChangeName(player.id)} onDelete={onDeletePlayer(player.id)} name={player.name} />
            ))
          }
          <Divider />
        </Flex>
      </Modal>
    </>
  );
}
);
