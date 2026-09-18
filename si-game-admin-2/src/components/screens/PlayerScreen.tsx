import React, { FC, useEffect, useRef } from "react"
import { useRouter } from "next/router"
import { Button, QRCode } from "antd"
import * as Data from "@/data"
import { Screensaver } from "@/components/admin/Screensaver"
import ThemesList from "@/components/player/ThemesList"
import ThemeRound from "@/components/player/ThemeRound"
import ThemesListInRound from "@/components/player/ThemesListInRound"
import QuestionScore from "@/components/player/QuestionScore"
import { QuestionTable } from "@/components/QuestionTable"
import { QuestionPlayer } from "@/components/question/QuestionPlayer"
import { QuestionPlayerPreparation } from "@/components/question/QuestionPlayerPreparation"
import { PlayerPanel } from "@/components/PlayerPanel"
import { Results } from "@/components/Results"
import { ConnectionBanner } from "@/components/ConnectionBanner"
import { GameStatusView } from "./GameStatusView"
import { FirstGameRedirect } from "./FirstGameRedirect"
import { FullscreenButton, FullscreenCornerButton } from "@/components/FullscreenButton"
import { SoundType, useSound } from "@/hooks/useSound"
import { useGameConnection } from "@/hooks/useGameConnection"
import { useGameStore } from "@/store/game"

export const PlayerScreen: FC<{ gameId: string | undefined, resolved: boolean }> = ({ gameId, resolved }) => {
  const router = useRouter()
  const { playSound } = useSound()
  useGameConnection(gameId, 'player')
  const loadedGameId = useGameStore(state => state.gameId)
  const status = useGameStore(state => state.status)
  const error = useGameStore(state => state.error)
  const screen = useGameStore(state => state.screen)
  const players = useGameStore(state => state.players)
  const roundName = useGameStore(state => state.roundName)
  const themeList = useGameStore(state => state.themeList)
  const themeListInRound = useGameStore(state => state.themeListInRound)
  const table = useGameStore(state => state.table)
  const question = useGameStore(state => state.question)
  const questionPage = useGameStore(state => state.questionPage)
  const isLastRound = useGameStore(state => state.isLastRound)
  const animatedQuestionId = useGameStore(state => state.animatedQuestionId)
  const roundIndex = useGameStore(state => state.progress?.roundIndex)

  const isReady = !!gameId && loadedGameId === gameId && status === 'ready'

  const soundKey = !isReady
    ? undefined
    : screen === Data.Screen.RoundName
      ? `round:${roundIndex ?? ''}:${roundName?.name ?? ''}`
      : screen === Data.Screen.ThemeList ? 'themes' : null
  const lastSoundKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (soundKey === undefined || soundKey === lastSoundKeyRef.current) {
      return
    }
    lastSoundKeyRef.current = soundKey
    if (soundKey === 'themes') {
      playSound(SoundType.RoundThemes)
    } else if (soundKey) {
      playSound(SoundType.RoundBegin)
    }
  }, [soundKey, playSound])

  if (resolved && !gameId) {
    return <FirstGameRedirect route="player" />
  }

  if (!isReady) {
    return (
      <>
        <ConnectionBanner />
        <GameStatusView route="player" status={loadedGameId === gameId ? status : 'loading'} error={error} className="h-screen" />
      </>
    )
  }

  const adminPath = `/admin/${encodeURIComponent(gameId)}`

  return (
    <>
      <ConnectionBanner />
      {screen === Data.Screen.Initial && (<>
        <div className="bg-blue-700 h-[100vh] flex flex-col justify-center items-center w-screen text-yellow-200 text-9xl">
          <QRCode value={`${window.location.origin}${adminPath}`} color="white" size={600} />
          <div className="mt-6 flex flex-wrap justify-center items-center gap-4">
            <Button size="large" onClick={() => { void router.push(adminPath) }}> GO </Button>
            <FullscreenButton />
          </div>
        </div>
      </>)}
      {screen !== Data.Screen.Initial &&
        <div className="overflow-hidden h-screen">
          <div className="h-full bg-blue-700">
            <PlayerPanel players={players} />
            <QuestionScore />
            {screen === Data.Screen.Screensaver && <Screensaver />}
            {screen === Data.Screen.ThemeList && themeList && <ThemesList themes={themeList.themes} />}
            {screen === Data.Screen.ThemeListInRound && themeListInRound && <ThemesListInRound themes={themeListInRound.themes} />}
            {screen === Data.Screen.RoundName && roundName && <ThemeRound themeName={roundName.name} />}
            {screen === Data.Screen.Table && table && <div className="h-[88vh]"><QuestionTable data={table} className="text-5xl" animateSelectQuestion={animatedQuestionId} /></div>}
            {screen === Data.Screen.Question && question && questionPage && <QuestionPlayer question={question} pageData={questionPage} />}
            {screen === Data.Screen.QuestionPreparation && question && <QuestionPlayerPreparation question={question} />}
            {screen === Data.Screen.Results && <Results players={players} isLastRound={isLastRound} />}
          </div>
          <FullscreenCornerButton />
        </div>
      }
    </>
  )
}
