import React, { FC, useCallback, useEffect, useState } from 'react'
import { Button, Spin } from 'antd'
import Router from 'next/router'
import { client } from '@/client'
import { errorText } from '@/utils/notify'
import type { RouteName } from '@/utils/route'

type State = { status: 'loading' } | { status: 'empty' } | { status: 'error', message: string }

export const FirstGameRedirect: FC<{ route: RouteName }> = ({ route }) => {
  const [state, setState] = useState<State>({ status: 'loading' })

  const openFirstGame = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const games = await client.getGames()
      if (games.length > 0) {
        await Router.replace(`/${route}/${encodeURIComponent(games[0].gameId)}`)
      } else {
        setState({ status: 'empty' })
      }
    } catch (error) {
      setState({ status: 'error', message: errorText(error) })
    }
  }, [route])

  useEffect(() => {
    void openFirstGame()
  }, [openFirstGame])

  return (
    <div className="bg-blue-700 min-h-dvh flex flex-col justify-center items-center w-full px-4 text-center text-white gap-4">
      {state.status === 'loading' && <Spin size="large" />}
      {state.status === 'empty' && <h1 className="text-3xl">На сервере нет ни одной игры</h1>}
      {state.status === 'error' && (<>
        <h1 className="text-3xl">Не удалось получить список игр</h1>
        <div className="text-lg">{state.message}</div>
      </>)}
      {state.status !== 'loading' && <Button size="large" onClick={() => { void openFirstGame() }}>Повторить</Button>}
    </div>
  )
}
