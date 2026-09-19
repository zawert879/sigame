import { FC } from "react"
import Link from "next/link"
import { Button, Spin } from "antd"
import type { LoadStatus } from "@/store/game"
import type { RouteName } from "@/utils/route"

export const GameStatusView: FC<{ route: RouteName, status: LoadStatus, error: string | null, className?: string }> = ({ route, status, error, className }) => {
  return (
    <div className={`bg-blue-700 flex flex-col justify-center items-center w-full text-white gap-4 ${className ?? 'min-h-dvh px-4 text-center'}`}>
      {status === 'notFound' && (<>
        <h1 className="text-4xl">Игра не найдена</h1>
        <Link href={`/${route}`} className="text-yellow-200 underline text-xl">Перейти к текущей игре</Link>
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
