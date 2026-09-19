import React, { FC } from "react"
import * as Data from "@/data"
import { GameInit } from "@/components/initial/GameInit"
import { Menu } from "@/components/menu/Menu"
import { ScoreManager } from "@/components/ScoreManager"
import { PlayerTable } from "@/components/admin/PlayerTable"
import { Screensaver } from "@/components/admin/Screensaver"
import ThemesList from "@/components/admin/ThemesList"
import ThemeRound from "@/components/admin/ThemeRound"
import { AdminTable } from "@/components/admin/AdminTable"
import { QuestionAdmin } from "@/components/admin/QuestionAdmin"
import { HostActions } from "@/components/admin/HostActions"
import { Results } from "@/components/Results"
import { ConnectionBanner } from "@/components/ConnectionBanner"
import { SoundUnlock } from "@/components/SoundUnlock"
import { GameStatusView } from "./GameStatusView"
import { FirstGameRedirect } from "./FirstGameRedirect"
import { useGameConnection } from "@/hooks/useGameConnection"
import { useGameStore } from "@/store/game"
import { screenTitle } from "@/utils/screens"

const STAGE_HEIGHT: Partial<Record<Data.Screen, string>> = {
  [Data.Screen.Screensaver]: "h-28 sm:h-40",
  [Data.Screen.RoundName]: "h-40 sm:h-56",
}

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

  if (resolved && !gameId) {
    return <FirstGameRedirect route="admin" />
  }

  if (!gameId || loadedGameId !== gameId || status !== 'ready' || !meta) {
    return (
      <>
        <ConnectionBanner />
        <GameStatusView route="admin" status={loadedGameId === gameId ? status : 'loading'} error={error} />
      </>
    )
  }

  if (screen === Data.Screen.Initial) {
    return (
      <>
        <ConnectionBanner />
        <div className="min-h-dvh bg-blue-700 px-2 py-3 font-sans sm:px-6 sm:py-8">
          <GameInit game={meta} />
        </div>
      </>
    )
  }

  const stageHeight = (screen && STAGE_HEIGHT[screen]) ?? ""

  return (
    <>
      <ConnectionBanner />
      <SoundUnlock />
      <div className="flex min-h-dvh flex-col bg-slate-200 font-sans lg:h-dvh lg:min-h-[36rem]">
        <Menu refresh={refresh} />
        <div className="flex flex-1 flex-col gap-2 p-2 sm:gap-3 sm:p-3 lg:min-h-0 lg:flex-row">
          <main
            aria-label={screenTitle(screen)}
            className="flex min-w-0 flex-col overflow-hidden rounded-xl bg-blue-800 text-white shadow-sm lg:min-h-0 lg:flex-1"
          >
            <div className={`relative min-w-0 overflow-hidden lg:h-auto lg:min-h-0 lg:flex-1 ${stageHeight}`}>
              {screen === Data.Screen.Screensaver && <Screensaver className="text-3xl sm:text-5xl lg:text-6xl" />}
              {screen === Data.Screen.ThemeList && themeList && <ThemesList themes={themeList.themes} />}
              {screen === Data.Screen.ThemeListInRound && themeListInRound && <ThemesList themes={themeListInRound.themes} />}
              {screen === Data.Screen.RoundName && roundName && <ThemeRound themeName={roundName.name} />}
              {screen === Data.Screen.Table && table && <AdminTable data={table} />}
              {screen === Data.Screen.QuestionPreparation && question && questionPage && <QuestionAdmin question={question} pageData={questionPage} isPreparation={true} />}
              {screen === Data.Screen.Question && question && questionPage && <QuestionAdmin question={question} pageData={questionPage} isPreparation={false} />}
              {screen === Data.Screen.Results && <Results players={players} isLastRound={isLastRound} compact />}
            </div>
            <HostActions />
          </main>
          <aside aria-label="Управление игроками" className="flex shrink-0 flex-col gap-2 sm:gap-3 lg:min-h-0 lg:w-[23rem] lg:overflow-y-auto xl:w-[31rem] 2xl:w-[36rem]">
            <PlayerTable players={players} />
            <ScoreManager />
          </aside>
        </div>
      </div>
    </>
  )
}
