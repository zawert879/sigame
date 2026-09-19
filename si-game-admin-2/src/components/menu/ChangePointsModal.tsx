import { client } from "@/client";
import { ResponseGetSettings } from "@/types";
import { Button, Flex, Modal, Slider, Typography } from "antd";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { InputNumber } from "../override/InputNumber";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useGameStore } from "@/store/game";
import { notifyError } from "@/utils/notify";

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

export const ChangePointsModal: React.FC<{ open: boolean; onBack: () => void }> = memo(
  function ChangePointsModal({ open, onBack }) {
    const [data, setData] = useState<ResponseGetSettings>()
    const dataRef = useRef<ResponseGetSettings>()

    const updateData = useCallback((patch: Partial<ResponseGetSettings>) => {
      if (dataRef.current) {
        dataRef.current = { ...dataRef.current, ...patch }
        setData(dataRef.current)
      }
    }, [])

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
      if (open) {
        fetch()
      }
    }, [fetch, open])

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
        <Modal
          title="Настройки"
          width={440}
          open={open}
          onCancel={onBack}
          footer={[
            <Button block key="back" size="large" onClick={onBack}>
              Назад
            </Button>,
          ]}
        >
          <Flex vertical gap="small" className="w-full">
            <Typography.Title level={5} className="!mb-0">Настройка быстрых очков</Typography.Title>
            <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
              <span>Маленький</span>
              <InputNumber
                className="!w-full"
                min={0}
                value={data?.little}
                onChange={setLittle}
              />
              <span>Большой</span>
              <InputNumber
                className="!w-full"
                min={0}
                value={data?.big}
                onChange={setBig}
              />
            </div>
            <Typography.Title level={5} className="!mb-0 !mt-4">Настройка звука</Typography.Title>
            <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
              <span>Плеер</span>
              <Slider
                className="!mx-2"
                min={0}
                max={100}
                disabled={!data}
                onChange={setPlayerVolume}
                value={typeof data?.playerVolume === 'number' ? data.playerVolume : 0}
              />
              <span>Админ</span>
              <Slider
                className="!mx-2"
                min={0}
                max={100}
                disabled={!data}
                onChange={setAdminVolume}
                value={typeof data?.adminVolume === 'number' ? data.adminVolume : 0}
              />
            </div>
          </Flex>
        </Modal>
      </>
    );
  }
);
