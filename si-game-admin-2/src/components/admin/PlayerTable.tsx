import React, { useCallback, useEffect } from "react";
import { Button, Table } from "antd/lib";
import { DislikeOutlined, LikeOutlined, AimOutlined } from "@ant-design/icons/lib";
import { Player } from "@/types";
import { client } from "@/client";
import _ from "lodash";
import { InputNumber } from "../override/InputNumber";

const { Column } = Table;

export const PlayerTable: React.FC<{ players: (Player & {isCurrent: boolean})[]}> = ({ players }) => {
  const onUpdateSelectPlayer = useCallback((record: Player) => () => {
    client.selectPlayer(record.id);
  }, [])
  const onUpdateScore = useCallback((record: Player) => async (value: any) => {
    client.setScorePlayer(record.id, value);
  }, [])
  const onUpdateWin = useCallback((record: Player) => async (value: any) => {
    client.setWinPlayer(record.id, value);
  }, [])
  const onUpdateLose = useCallback((record: Player) => async (value: any) => {
    client.setLosePlayer(record.id, value);
  }, [])
  return (
    <Table
      dataSource={players.map(p => ({ key: p.id, ...p }))}
      pagination={false}
      style={{ height: "calc(100vh - 744px)" }}
      className="scroll-auto overflow-auto"
    >
      <Column
        title="Очередь"
        align="center"
        width={100}
        key="queue"
        render={(_: any, record: any /* Player */) => {
          if(record.isCurrent){
              return (<Button
                type="primary"
                shape="circle"
                size={"large"}
                onClick={onUpdateSelectPlayer(record)}
                className={'!bg-orange-500'}
                icon={<AimOutlined style={{ fontSize: 26 }} />}
              />)
          } else
          if (record.queue !== null) {
            return (
              <Button
                type="primary"
                shape="circle"
                size={"large"}
                disabled
                className={`${record.queue === 0 ? '!bg-green-500' : '!bg-orange-500'} !text-white`}
              >
                {record.queue + 1}
              </Button>
            );
          } else {
            return (
              <Button
                type="primary"
                shape="circle"
                size={"large"}
                onClick={onUpdateSelectPlayer(record)}
                icon={<AimOutlined style={{ fontSize: 26 }} />}
              />
            );
          }
        }}
      />
      <Column
        title="Имя"
        align="center"
        dataIndex="name"
        key="name"
        className="!w-3/12"
      />
      <Column
        align="center"
        width={70}
        key="queue"
        render={(_: any, record: Player) => (
          <Button
            type="primary"
            shape="circle"
            size={"large"}
            onClick={() => client.winPlayer(record.id)}
            icon={<LikeOutlined />}
          />
        )}
      />
      <Column
        align="center"
        width={70}
        key="queue"
        render={(_: any, record: Player) => (
          <Button
            type="primary"
            shape="circle"
            size={"large"}
            onClick={() => client.losePlayer(record.id)}
            icon={<DislikeOutlined />}
          />
        )}
      />
      <Column
        align="center"
        title="Очки"
        dataIndex="score"
        key="score"
        render={(value, record: Player) => (
          <InputNumber
            className="!w-full"
            value={value}
            onChange={_.debounce(onUpdateScore(record), 150)}
          />
        )}
      />
      <Column
        align="center"
        title="WIN"
        dataIndex="win"
        key="win"
        render={(value, record: Player) => (
          <InputNumber
            className="!w-full"
            value={value}
            onChange={_.debounce(onUpdateWin(record), 150)}
          />
        )}
      />
      <Column
        align="center"
        title="LOSE"
        dataIndex="lose"
        key="lose"
        render={(value, record: any /* Player */) => (
          <InputNumber
            className="!w-full"
            value={value}
            onChange={_.debounce(onUpdateLose(record), 150)}
          />
        )}
      />
    </Table>
  );
};
