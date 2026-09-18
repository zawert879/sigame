import { client } from "@/client";
import { ResponseGetSettings } from "@/types";
import { Button, Flex, Modal, Slider, Space, Typography } from "antd";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { InputNumber } from "../override/InputNumber";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useGameStore } from "@/store/game";
import { notifyError } from "@/utils/notify";

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

// eslint-disable-next-line react/display-name
export const ChangePointsModal: React.FC = memo(
  () => {
    const [data, setData] = useState<ResponseGetSettings>()
    const dataRef = useRef<ResponseGetSettings>()
    const [isModalOpen, setIsModalOpen] = useState(false);

    const updateData = useCallback((patch: Partial<ResponseGetSettings>) => {
      if (dataRef.current) {
        dataRef.current = { ...dataRef.current, ...patch }
        setData(dataRef.current)
      }
    }, [])

    const showModal = useCallback(() => {
      setIsModalOpen(true);
    }, []);

    const handleCancel = useCallback(() => {
      setIsModalOpen(false);
    }, []);

    const fetch = useCallback(async () => {
      try {
        const settings = await client.getSettingsData()
        dataRef.current = settings
        setData(settings)
        useGameStore.getState().setSettings(settings)
      } catch (error) {
        notifyError(error, 'Не удалось загрузить настройки')
      }
    }, [])

    useEffect(() => {
      if (isModalOpen === true) {
        fetch()
      }
    }, [fetch, isModalOpen])

    const save = useCallback(async (request: () => Promise<void>) => {
      try {
        await request()
        if (dataRef.current) {
          useGameStore.getState().setSettings(dataRef.current)
        }
      } catch (error) {
        notifyError(error, 'Не удалось сохранить настройки')
        await fetch()
      }
    }, [fetch])

    const sendLittle = useDebouncedCallback((value: number) => save(() => client.setScoreLittle(value)), 150)
    const sendBig = useDebouncedCallback((value: number) => save(() => client.setScoreBig(value)), 150)
    const sendVolumes = useDebouncedCallback(() => {
      const current = dataRef.current
      if (current) {
        return save(() => client.setVolumeSettings(current.playerVolume, current.adminVolume))
      }
    }, 150)

    const setLittle = useCallback((value: number | string | null) => {
      if (isNumber(value)) {
        updateData({ little: value })
        sendLittle(value)
      }
    }, [sendLittle, updateData])

    const setBig = useCallback((value: number | string | null) => {
      if (isNumber(value)) {
        updateData({ big: value })
        sendBig(value)
      }
    }, [sendBig, updateData])

    const setPlayerVolume = useCallback((value: number) => {
      if (isNumber(value) && dataRef.current) {
        updateData({ playerVolume: value })
        sendVolumes()
      }
    }, [sendVolumes, updateData])

    const setAdminVolume = useCallback((value: number) => {
      if (isNumber(value) && dataRef.current) {
        updateData({ adminVolume: value })
        sendVolumes()
      }
    }, [sendVolumes, updateData])

    return (
      <>
        <Button type="primary" size="large" block onClick={showModal}>
          Настройки
        </Button>
        <Modal
          title="Настройки"
          open={isModalOpen}
          onCancel={handleCancel}
          footer={[
            <Button block key="back" onClick={handleCancel}>
              Назад
            </Button>,
          ]}
        >
          <Flex vertical gap="small" className="w-full">
            <Typography.Title level={5} >Настройка быстрых очков</Typography.Title>
            <Space.Compact>
              <span className="mr-2 w-32 flex items-center"> Маленький</span>
              <InputNumber
                className="!w-full"
                min={0}
                value={data?.little}
                onChange={setLittle}
              />
            </Space.Compact>
            <Space.Compact>
              <span className="mr-2 w-32 flex items-center"> Большой</span>
              <InputNumber
                className="!w-full"
                min={0}
                value={data?.big}
                onChange={setBig}
              />
            </Space.Compact>
          </Flex>
          <Flex vertical gap="small" className="w-full">
            <Typography.Title level={5} >Настройка звука</Typography.Title>
            <Space.Compact>
              <span className="mr-2 w-32 flex items-center"> Плеер</span>
              <Slider
                className="grow"
                min={0}
                max={100}
                disabled={!data}
                onChange={setPlayerVolume}
                value={typeof data?.playerVolume === 'number' ? data.playerVolume : 0}
              />
            </Space.Compact>
            <Space.Compact>
              <span className="mr-2 w-32 flex items-center"> Админ</span>
              <Slider
                className="grow"
                min={0}
                max={100}
                disabled={!data}
                onChange={setAdminVolume}
                value={typeof data?.adminVolume === 'number' ? data.adminVolume : 0}
              />
            </Space.Compact>
          </Flex>
        </Modal>
      </>
    );
  }
);
