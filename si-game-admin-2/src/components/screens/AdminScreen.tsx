import React, { FC } from "react"
import * as Data from "@/data"
import { GameInit } from "@/components/initial/GameInit"
import { Menu } from "@/components/menu/Menu"
import { ScoreManager } from "@/components/ScoreManager"
import { PlayerTable } from "@/components/admin/PlayerTable"
import { Screensaver } from "@/components/admin/Screensaver"
import ThemesList from "@/components/admin/ThemesList"
import ThemeRound from "@/components/admin/ThemeRound"
import { QuestionTable } from "@/components/QuestionTable"
import { QuestionAdmin } from "@/components/admin/QuestionAdmin"
import { Results } from "@/components/Results"
import { ConnectionBanner } from "@/components/ConnectionBanner"
import { GameStatusView } from "./GameStatusView"
import { FirstGameRedirect } from "./FirstGameRedirect"
import { useGameConnection } from "@/hooks/useGameConnection"
import { useGameStore } from "@/store/game"

// Host's control panel (phone / tablet).
export const AdminScreen: FC<{ gameId: string | undefined, resolved: boolean }> = ({ gameId, resolved }) => {
  const { refresh } = useGameConnection(gameId, 'admin')
  const loadedGameId = useGameStore(state => state.gameId)
  const status = useGameStore(state => state.status)
  const error = useGameStore(state => state.error)
  const meta = useGameStore(state => state.meta)
  const screen = useGameStore(state => state.screen)
  const players = useGameStore(state => state.players)
  const roundName = useGameStore(state => state.roundName)
  const themeList = useGameStore(state => state.themeList)
  const themeListInRound = useGameStore(state => state.themeListInRound)
  const table = useGameStore(state => state.table)
  const question = useGameStore(state => state.question)
  const questionPage = useGameStore(state => state.questionPage)
  const isLastRound = useGameStore(state => state.isLastRound)

  // "/admin" without an id: the host panel of the first game (a stable host link, e.g. "/admin?token=…")
  if (resolved && !gameId) {
    return <FirstGameRedirect route="admin" />
  }

  if (!gameId || loadedGameId !== gameId || status !== 'ready' || !meta) {
    return (
      <>
        <ConnectionBanner />
        <GameStatusView status={loadedGameId === gameId ? status : 'loading'} error={error} />
      </>
    )
  }

  return (
    <>
      <ConnectionBanner />
      {screen === Data.Screen.Initial && <div className="bg-blue-700 h-[92vh] lg:h-[100vh] flex flex-col justify-center items-center w-screen">
        <GameInit game={meta} />
      </div>}
      {screen !== Data.Screen.Initial &&
        <div className="overflow-hidden h-[92vh] lg:h-[100vh]">
          <div className="flex justify-center">
            <p className=" h-6 w-full text-center bg-yellow-300">{screen}</p>
          </div>
          <div className="h-[600px] bg-blue-700">
            {screen === Data.Screen.Screensaver && <Screensaver />}
            {screen === Data.Screen.ThemeList && themeList && <ThemesList themes={themeList.themes} />}
            {screen === Data.Screen.ThemeListInRound && themeListInRound && <ThemesList themes={themeListInRound.themes} />}
            {screen === Data.Screen.RoundName && roundName && <ThemeRound themeName={roundName.name} />}
            {screen === Data.Screen.Table && table && <QuestionTable data={table} animateSelectQuestion={null} />}
            {screen === Data.Screen.QuestionPreparation && question && questionPage && <QuestionAdmin question={question} pageData={questionPage} isPreparation={true} />}
            {screen === Data.Screen.Question && question && questionPage && <QuestionAdmin question={question} pageData={questionPage} isPreparation={false} />}
            {screen === Data.Screen.Results && <Results players={players} isLastRound={isLastRound} compact />}
          </div>
          <Menu refresh={refresh} />
          <ScoreManager />
          <PlayerTable players={players} />
        </div>
      }
    </>
  )
}
