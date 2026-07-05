import { Card } from "antd/lib";
import { PlayCircleOutlined } from '@ant-design/icons/lib';
import { memo, useCallback } from "react";
import { useRouter } from "next/router";

// eslint-disable-next-line react/display-name
export const GameCard: React.FC<{ title: string, id: string, packageName: string | null }> = memo(({ title, id, packageName }) => {
  const router = useRouter()

  const onSelectGame = useCallback(() => {
    router.push(`/admin/${id}`)
  }, [])
  return (
    <Card title={title} style={{ width: 800 }} actions={[
      <PlayCircleOutlined key="playButton" className="!text-3xl" onClick={onSelectGame} />
    ]}>
      <Card.Meta title={`Пак: ${packageName ? packageName : 'Не выбран'}`} description={id} />
    </Card>
  )
});
