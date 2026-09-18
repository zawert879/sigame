import { FC } from "react"
import Link from "next/link"
import { Button, Spin } from "antd"
import type { LoadStatus } from "@/store/game"

// Placeholder of a game screen until the snapshot is loaded: spinner, "game not found" or a load error.
export const GameStatusView: FC<{ status: LoadStatus | 'noId', error: string | null, className?: string }> = ({ status, error, className }) => {
  return (
    <div className={`bg-blue-700 flex flex-col justify-center items-center w-screen text-white gap-4 ${className ?? 'h-[92vh] lg:h-[100vh]'}`}>
      {(status === 'notFound' || status === 'noId') && (<>
        <h1 className="text-4xl">Игра не найдена</h1>
        <Link href="/" className="text-yellow-200 underline text-xl">Перейти к текущей игре</Link>
      </>)}
      {status === 'error' && (<>
        <h1 className="text-3xl">Не удалось загрузить игру</h1>
        {error && <div className="text-lg">{error}</div>}
        <Button size="large" onClick={() => window.location.reload()}>Повторить</Button>
      </>)}
      {(status === 'idle' || status === 'loading') && <Spin size="large" />}
    </div>
  )
}
