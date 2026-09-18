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
import { SoundType, useSound } from "@/hooks/useSound"
import { useGameConnection } from "@/hooks/useGameConnection"
import { useGameStore } from "@/store/game"

// Game screen for the players (TV).
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

  // Sounds when a screen is entered: the round name and the list of the pack's themes. A snapshot reloaded after a
  // reconnect does not replay them.
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
    return <GameStatusView status="noId" error={null} className="h-screen" />
  }

  if (!isReady) {
    return (
      <>
        <ConnectionBanner />
        <GameStatusView status={loadedGameId === gameId ? status : 'loading'} error={error} className="h-screen" />
      </>
    )
  }

  // Never carries the admin token: the players look at this screen and can scan the QR. The host device gets the
  // token from the host link printed by the server (it is remembered in localStorage), GO on this device uses its own.
  const adminPath = `/admin/${encodeURIComponent(gameId)}`

  return (
    <>
      <ConnectionBanner />
      {screen === Data.Screen.Initial && (<>
        <div className="bg-blue-700 h-[100vh] flex flex-col justify-center items-center w-screen text-yellow-200 text-9xl">
          <QRCode value={`${window.location.origin}${adminPath}`} color="white" size={600} />
          <Button onClick={() => { void router.push(adminPath) }}> GO </Button>
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
        </div>
      }
    </>
  )
}
