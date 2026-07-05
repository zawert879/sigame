import { client } from "@/client";
import { ResponseGetSettings } from "@/types";
import { Button, Flex, Modal, Slider, Space, Typography } from "antd/lib";
import React, { memo, useCallback, useEffect, useState } from "react";
import _ from "lodash";
import { InputNumber } from "../override/InputNumber";
// eslint-disable-next-line react/display-name
export const ChangePointsModal: React.FC = memo(
  () => {
    const [data, setData] = useState<ResponseGetSettings>()
    const [isModalOpen, setIsModalOpen] = useState(false);

    const showModal = useCallback(() => {
      setIsModalOpen(true);
    }, []);

    const handleCancel = useCallback(() => {
      setIsModalOpen(false);
    }, []);

    const fetch = useCallback(async () => {
      const data = await client.getSettingsData()
      setData(data)
    }, [])

    useEffect(() => {
      if (isModalOpen === true) {
        fetch()
      }
    }, [fetch, isModalOpen])

    const setLittle = useCallback(async (value: number | null) => {
      if (value) {
        await client.setScoreLittle(value)
        fetch()
      }
    }, [fetch])

    const setBig = useCallback(async (value: number | null) => {
      if (value) {
        await client.setScoreBig(value)
        fetch()
      }
    }, [fetch])
  
    const setPlayerVolume = useCallback(async (value: number | null) => {
      if (value) {
        await client.setVolumeSettings(value, data!.adminVolume)
        fetch()
      }
    }, [fetch, data])
    const setAdminVolume = useCallback(async (value: number | null) => {
      if (value) {
        await client.setVolumeSettings(data!.playerVolume, value)
        fetch()
      }
    }, [fetch, data])

    return (
      <>
        <Button type="primary" size="large" block onClick={showModal}>
          Настройки
        </Button>
        <Modal
          title="Настройка быстрых очков"
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
                value={data?.little}
                onChange={_.debounce(setLittle, 150) as any}
              />
            </Space.Compact>
            <Space.Compact>
              <span className="mr-2 w-32 flex items-center"> Большой</span>
              <InputNumber
                className="!w-full"
                value={data?.big}
                onChange={_.debounce(setBig, 150) as any}
              />
            </Space.Compact>
          </Flex>
          <Flex vertical gap="small" className="w-full">
            <Typography.Title level={5} >Настройка звука</Typography.Title>
            <Space.Compact>
              <span className="mr-2 w-32 flex items-center"> Плеер</span>
              <Slider
                min={0}
                max={100}
                onChange={_.debounce(setPlayerVolume, 150) as any}
                value={typeof data?.playerVolume === 'number' ? data.playerVolume : 0}
              />
            </Space.Compact>
            <Space.Compact>
              <span className="mr-2 w-32 flex items-center"> Админ</span>
              <Slider
                min={0}
                max={100}
                onChange={_.debounce(setAdminVolume, 150) as any}
                value={typeof data?.adminVolume === 'number' ? data.adminVolume : 0}
              />
            </Space.Compact>
          </Flex>
        </Modal>
      </>
    );
  }
);
