import React, { FC, useEffect, useRef, useState } from "react"
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

const QR_QUIET_ZONE = 0.12
const QR_RESERVED_HEIGHT = 190

const useQrSize = () => {
  const [size, setSize] = useState(0)
  useEffect(() => {
    const update = () => {
      const byHeight = (window.innerHeight - QR_RESERVED_HEIGHT) / (1 + 2 * QR_QUIET_ZONE)
      const byWidth = (window.innerWidth * 0.8) / (1 + 2 * QR_QUIET_ZONE)
      setSize(Math.max(120, Math.floor(Math.min(byHeight, byWidth))))
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])
  return size
}

const InitialScreen: FC<{ adminPath: string }> = ({ adminPath }) => {
  const router = useRouter()
  const size = useQrSize()
  const quietZone = Math.round(size * QR_QUIET_ZONE)

  return (
    <div className="fixed inset-0 overflow-hidden bg-blue-700 flex flex-col justify-center items-center gap-[3vh] p-4">
      {size > 0 && (
        <div className="bg-white rounded-2xl shadow-2xl" style={{ padding: quietZone }}>
          <QRCode
            value={`${window.location.origin}${adminPath}`}
            color="#000000"
            bgColor="#ffffff"
            bordered={false}
            errorLevel="M"
            size={size}
          />
        </div>
      )}
      <div className="flex flex-wrap justify-center items-center gap-4">
        <Button
          size="large"
          className="!h-auto !px-[2.4em] !py-[0.3em] !text-[length:clamp(1.5rem,3.4vh,3.5rem)] !font-bold !tracking-wider !text-blue-900 !bg-yellow-300 !border-yellow-300 hover:!bg-yellow-200"
          onClick={() => { void router.push(adminPath) }}
        >
          GO
        </Button>
        <FullscreenButton />
      </div>
    </div>
  )
}

export const PlayerScreen: FC<{ gameId: string | undefined, resolved: boolean }> = ({ gameId, resolved }) => {
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
      {screen === Data.Screen.Initial && <InitialScreen adminPath={adminPath} />}
      {screen !== Data.Screen.Initial &&
        <div className="fixed inset-0 overflow-hidden bg-blue-700 flex flex-col">
          {players.length > 0 && <PlayerPanel players={players} />}
          <QuestionScore />
          <main className="relative flex-1 min-h-0 overflow-hidden">
            {screen === Data.Screen.Screensaver && <Screensaver className="text-[length:min(9vh,7vw)]" />}
            {screen === Data.Screen.ThemeList && themeList && <ThemesList themes={themeList.themes} />}
            {screen === Data.Screen.ThemeListInRound && themeListInRound && <ThemesListInRound themes={themeListInRound.themes} />}
            {screen === Data.Screen.RoundName && roundName && <ThemeRound themeName={roundName.name} />}
            {screen === Data.Screen.Table && table && <QuestionTable data={table} className="tv-stage p-[1.5vmin]" fontSize="min(9vh, 5.5vw)" animateSelectQuestion={animatedQuestionId} />}
            {screen === Data.Screen.Question && question && questionPage && <QuestionPlayer question={question} pageData={questionPage} />}
            {screen === Data.Screen.QuestionPreparation && question && <QuestionPlayerPreparation question={question} />}
            {screen === Data.Screen.Results && <Results players={players} isLastRound={isLastRound} />}
          </main>
          <FullscreenCornerButton />
        </div>
      }
    </>
  )
}
