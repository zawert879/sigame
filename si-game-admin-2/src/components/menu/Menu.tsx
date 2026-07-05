import { Button, Flex } from "antd/lib";
import React, { useCallback, useState } from "react";
import { Progress } from "../Progress";
import { SendOutlined } from "@ant-design/icons/lib";
import { SettingsModal } from "./SettingsModal";
import { client } from "@/client";

export const Menu: React.FC<{forceRefreshCb: () => void}> = ({forceRefreshCb}) => {
  const [isSpin, setIsSpin] = useState(false)
  const onNext = useCallback(async () => {
    setIsSpin(true)
    await client.next()
    setIsSpin(false)
  }, [])

  return (
    <Flex>
      <SettingsModal forceRefreshCb={forceRefreshCb} />
      <Progress question={32} reflection={50} round={6} />
      <Button type="primary" className="!h-24 !w-24 m-1" size="large" onClick={onNext} icon={<SendOutlined spin={isSpin} style={{ fontSize: 48 }} />} />
    </Flex>
  )
};
