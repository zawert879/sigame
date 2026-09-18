import React, { useCallback } from "react";
import { Button, Table } from "antd";
import { DislikeOutlined, LikeOutlined, AimOutlined } from "@ant-design/icons";
import { client } from "@/client";
import { InputNumber } from "../override/InputNumber";
import type { PlayerView } from "@/store/game";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { notifyError } from "@/utils/notify";

const { Column } = Table;

const run = async (errorTitle: string, request: () => Promise<void>) => {
  try {
    await request()
  } catch (error) {
    notifyError(error, errorTitle)
  }
}

// Number cell with its own debounced sender (one per cell, created once).
const NumberCell: React.FC<{ value: number, onCommit: (value: number) => Promise<void> }> = ({ value, onCommit }) => {
  const commit = useDebouncedCallback(onCommit, 150)
  const onChange = useCallback((next: number | string | null) => {
    if (typeof next === 'number' && Number.isFinite(next)) {
      commit(next)
    }
  }, [commit])
  return (
    <InputNumber
      className="!w-full"
      value={value}
      onChange={onChange}
    />
  )
}

export const PlayerTable: React.FC<{ players: PlayerView[] }> = ({ players }) => {
  const onUpdateSelectPlayer = useCallback((record: PlayerView) => () => {
    void run('Не удалось выбрать игрока', () => client.selectPlayer(record.id));
  }, [])
  const onUpdateScore = useCallback((record: PlayerView) => (value: number) =>
    run('Не удалось изменить очки', () => client.setScorePlayer(record.id, value)), [])
  const onUpdateWin = useCallback((record: PlayerView) => (value: number) =>
    run('Не удалось изменить число правильных ответов', () => client.setWinPlayer(record.id, value)), [])
  const onUpdateLose = useCallback((record: PlayerView) => (value: number) =>
    run('Не удалось изменить число неверных ответов', () => client.setLosePlayer(record.id, value)), [])
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
        render={(_: unknown, record: PlayerView) => {
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
        key="win-button"
        render={(_: unknown, record: PlayerView) => (
          <Button
            type="primary"
            shape="circle"
            size={"large"}
            aria-label="Верно"
            onClick={() => run('Не удалось засчитать ответ', () => client.winPlayer(record.id))}
            icon={<LikeOutlined />}
          />
        )}
      />
      <Column
        align="center"
        width={70}
        key="lose-button"
        render={(_: unknown, record: PlayerView) => (
          <Button
            type="primary"
            shape="circle"
            size={"large"}
            aria-label="Неверно"
            onClick={() => run('Не удалось засчитать ответ', () => client.losePlayer(record.id))}
            icon={<DislikeOutlined />}
          />
        )}
      />
      <Column
        align="center"
        title="Очки"
        dataIndex="score"
        key="score"
        render={(value: number, record: PlayerView) => (
          <NumberCell value={value} onCommit={onUpdateScore(record)} />
        )}
      />
      <Column
        align="center"
        title="WIN"
        dataIndex="win"
        key="win"
        render={(value: number, record: PlayerView) => (
          <NumberCell value={value} onCommit={onUpdateWin(record)} />
        )}
      />
      <Column
        align="center"
        title="LOSE"
        dataIndex="lose"
        key="lose"
        render={(value: number, record: PlayerView) => (
          <NumberCell value={value} onCommit={onUpdateLose(record)} />
        )}
      />
    </Table>
  );
};
