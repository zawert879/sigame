import React, { FC, useCallback, useEffect, useState } from "react"
import { EventExit, EventStartQuestion, EventStartResults, EventStartRoundName, EventStartScreensaver, EventStartTable, EventStartThemeList, EventStartThemeListInRound, EventUpdateMediaPlayer, EventUpdatePlayers, EventUpdateQuestionPage, PayloadQuestionPage, PayloadStartQuestion, PayloadStartRoundName, PayloadStartTable, PayloadStartThemeList, PayloadStartThemeListInRound, Player as PlayerType, ResponseGetGame } from "@/types"
import { useRouter } from "next/router"
import { client } from "@/client"
import * as Data from "@/data"
import { Button, QRCode } from "antd/lib"
import { Screensaver } from "@/components/admin/Screensaver"
import ThemesList from "@/components/player/ThemesList"
import ThemeRound from "@/components/player/ThemeRound"
import { QuestionTable } from "@/components/QuestionTable"
import ThemesListInRound from "@/components/player/ThemesListInRound"
import { QuestionPlayer } from "@/components/question/QuestionPlayer"
import { PlayerPanel } from "@/components/PlayerPanel"
import { timeout } from "@/utils/utils"
import { QuestionPlayerPreparation } from "@/components/question/QuestionPlayerPreparation"
import { SoundType, useSound } from "@/hooks/useSound"
import { serverUrl } from "@/config"
import { eventEmitter } from '@/eventEmitter'
import { Results } from "@/components/Results"
import QuestionScore from "@/components/player/QuestionScore"

const Player: FC = () => {
  const { playSound } = useSound()
  const [game, setGame] = useState<ResponseGetGame>()
  const [players, setPlayers] = useState<PlayerType[]>([])
  const [questionPage, setQuestionPage] = useState<PayloadQuestionPage>()
  const [screen, setScreen] = useState<Data.Screen>()
  const [dataStartRoundName, setDataStartRoundName] = useState<PayloadStartRoundName>()
  const [dataStartThemeList, setDataStartThemeList] = useState<PayloadStartThemeList>()
  const [dataStartThemeListInRound, setDataStartThemeListInRound] = useState<PayloadStartThemeListInRound>()
  const [dataStartTable, setDataStartTable] = useState<PayloadStartTable>()
  const [dataStartQuestion, setDataStartQuestion] = useState<PayloadStartQuestion>()
  const [animateSelectQuestion, setAnimateSelectQuestion] = useState<string | null>(null)
  const router = useRouter()

  const fetchGames = useCallback(async () => {
    if (router.query.id && !Array.isArray(router.query.id)) {
      const game = await client.getGame(router.query.id)
      if (game) {
        await client.selectGame(game.gameId)
        setGame(game)
        setPlayers(game.players)
        setScreen(game.screenData.screen)
        if (game.screenData.screen === Data.Screen.Question) {
          setDataStartQuestion(game.screenData.payload)
          setQuestionPage({
            currentPage: game.screenData.payload.currentPage,
            nextPage: game.screenData.payload.nextPage,
          })
        }
        if (game.screenData.screen === Data.Screen.RoundName) {
          setDataStartRoundName(game.screenData.payload)
          playSound(SoundType.RoundBegin)
        }
        if (game.screenData.screen === Data.Screen.ThemeList) {
          setDataStartThemeList(game.screenData.payload)
          playSound(SoundType.RoundThemes)
        }
        if (game.screenData.screen === Data.Screen.ThemeListInRound) {
          setDataStartThemeListInRound(game.screenData.payload)
        }
        if (game.screenData.screen === Data.Screen.Table) {
          setDataStartTable(game.screenData.payload)
        }
      }
    }
  }, [playSound, router.query.id])

  const forceRefreshCb = useCallback(() => {
    fetchGames()
  }, [fetchGames])

  useEffect(() => {
    fetchGames()
  }, [fetchGames])

  const onChangeScreen = useCallback((data: EventStartScreensaver) => {
    if (game) {
      setScreen(Data.Screen.Screensaver)
    }
  }, [game])
  const onStartQuestion = useCallback(async (data: EventStartQuestion) => {
    if (game) {
      setAnimateSelectQuestion(data.payload.id)
      await timeout(1000)
      setScreen(Data.Screen.Question)
      setDataStartQuestion(data.payload)
      setQuestionPage({
        currentPage: data.payload.currentPage,
        nextPage: data.payload.nextPage,
      })
      setAnimateSelectQuestion(null)
    }
  }, [game])
  const onStartQuestionPreparation = useCallback(async (data: EventStartQuestion) => {
    if (game) {
      setAnimateSelectQuestion(data.payload.id)
      await timeout(1000)
      setScreen(Data.Screen.QuestionPreparation)
      setDataStartQuestion(data.payload)
      setQuestionPage({
        currentPage: data.payload.currentPage,
        nextPage: data.payload.nextPage,
      })
      setAnimateSelectQuestion(null)
    }
  }, [game])
  const onStartRoundName = useCallback((data: EventStartRoundName) => {
    if (game) {
      setScreen(Data.Screen.RoundName)
      setDataStartRoundName(data.payload)
    }
  }, [game])
  const onStartTable = useCallback((data: EventStartTable) => {
    if (game) {
      // playSound(SoundType.QuestionNoanswers)

      setScreen(Data.Screen.Table)
      setDataStartTable(data.payload)
    }
  }, [game, playSound])
  const onStartThemeList = useCallback((data: EventStartThemeList) => {
    if (game) {
      // playSound(SoundType.QuestionNoanswers)
      setScreen(Data.Screen.ThemeList)
      setDataStartThemeList(data.payload)
    }
  }, [game, playSound])
  const onStartThemeListInRound = useCallback((data: EventStartThemeListInRound) => {
    if (game) {
      // playSound(SoundType.QuestionNoanswers)
      setScreen(Data.Screen.ThemeListInRound)
      setDataStartThemeListInRound(data.payload)
    }
  }, [game, playSound])
  const onStartResults = useCallback((data: EventStartResults) => {
    if (game) {
      // playSound(SoundType.QuestionNoanswers)
      setScreen(Data.Screen.Results)
      // setDataStartThemeListInRound(data.payload)
    }
  }, [game, playSound])
  const onUpdateQuestionPage = useCallback((data: EventUpdateQuestionPage) => {
    if (game) {
      setQuestionPage(data.payload)
    }
  }, [game])
  const onExit = useCallback((data: EventExit) => {
    router.push('/')
  }, [router])
  const onUpdateMediaPlayer = useCallback((data: EventUpdateMediaPlayer) => {
    eventEmitter.emit('updateMediaPlayer', data)
  }, [])
  const onUpdatePlayer = useCallback((data: EventUpdatePlayers) => {
    let buff = [...players]
    for (const player of data.added) {
      buff.push(player)
    }

    buff = buff.filter(player => {
      return !data.removed.includes(player.id)
    })

    for (const player of data.updated) {
      const found = buff.find(p => p.id === player.id)
      if (found) {
        found.keyboardKey = player.keyboardKey
        found.name = player.name
        found.lose = player.lose
        found.win = player.win
        found.score = player.score
        found.queue = player.queue
      }
    }
    setPlayers(buff)
  }, [players])

  useEffect(() => {
    client.socket.socketIo.on(Data.Event.OnStartScreensaver, onChangeScreen)
    client.socket.socketIo.on(Data.Event.OnStartQuestion, onStartQuestion)
    client.socket.socketIo.on(Data.Event.onStartQuestionPreparation, onStartQuestionPreparation)
    client.socket.socketIo.on(Data.Event.OnStartRoundName, onStartRoundName)
    client.socket.socketIo.on(Data.Event.OnStartTable, onStartTable)
    client.socket.socketIo.on(Data.Event.OnStartThemeList, onStartThemeList)
    client.socket.socketIo.on(Data.Event.OnStartThemeListInRound, onStartThemeListInRound)
    client.socket.socketIo.on(Data.Event.OnStartResults, onStartResults)
    client.socket.socketIo.on(Data.Event.OnUpdateQuestionPage, onUpdateQuestionPage)
    client.socket.socketIo.on(Data.Event.OnUpdatePlayers, onUpdatePlayer)
    client.socket.socketIo.on(Data.Event.OnExit, onExit)
    client.socket.socketIo.on(Data.Event.OnUpdateMediaPlayer, onUpdateMediaPlayer)

    return () => {
      client.socket.socketIo.off(Data.Event.OnStartScreensaver, onChangeScreen)
      client.socket.socketIo.off(Data.Event.OnStartQuestion, onStartQuestion)
      client.socket.socketIo.off(Data.Event.onStartQuestionPreparation, onStartQuestionPreparation)
      client.socket.socketIo.off(Data.Event.OnStartRoundName, onStartRoundName)
      client.socket.socketIo.off(Data.Event.OnStartTable, onStartTable)
      client.socket.socketIo.off(Data.Event.OnStartThemeList, onStartThemeList)
      client.socket.socketIo.off(Data.Event.OnStartThemeListInRound, onStartThemeListInRound)
      client.socket.socketIo.off(Data.Event.OnStartResults, onStartResults)
      client.socket.socketIo.off(Data.Event.OnUpdateQuestionPage, onUpdateQuestionPage)
      client.socket.socketIo.off(Data.Event.OnUpdatePlayers, onUpdatePlayer)
      client.socket.socketIo.off(Data.Event.OnExit, onExit)
      client.socket.socketIo.off(Data.Event.OnUpdateMediaPlayer, onUpdateMediaPlayer)

    }
  }, [onUpdateQuestionPage, onChangeScreen, onStartQuestion, onStartRoundName, onStartTable, onStartThemeList, onStartThemeListInRound, onUpdatePlayer, onExit, onStartQuestionPreparation, onUpdateMediaPlayer])

  return (
    <>
      {game && screen === Data.Screen.Initial && (<>
        <div className="bg-blue-700 h-[100vh] flex flex-col justify-center items-center w-screen text-yellow-200 text-9xl">
          <QRCode value={`${serverUrl}/admin/${router.query.id}`} color="white" size={600} />
          <Button onClick={() => { router.push(`/admin/${router.query.id}`) }}> GO </Button>
        </div>
      </>)}
      {game && screen !== Data.Screen.Initial &&
        <div className="overflow-hidden h-screen">
          <div className="h-full bg-blue-700">
            <PlayerPanel players={players} />
            <QuestionScore defaultScore={game.score} />
            {screen === Data.Screen.Screensaver && <Screensaver />}
            {screen === Data.Screen.ThemeList && dataStartThemeList && <ThemesList themes={dataStartThemeList.themes} />}
            {screen === Data.Screen.ThemeListInRound && dataStartThemeListInRound && <ThemesListInRound themes={dataStartThemeListInRound.themes} />}
            {screen === Data.Screen.RoundName && dataStartRoundName && <ThemeRound themeName={dataStartRoundName.name} />}
            {screen === Data.Screen.Table && dataStartTable && <div className="h-[88vh]"><QuestionTable data={dataStartTable} className="text-5xl" animateSelectQuestion={animateSelectQuestion} /></div>}
            {screen === Data.Screen.Question && dataStartQuestion && questionPage && <QuestionPlayer question={dataStartQuestion} pageData={questionPage} />}
            {screen === Data.Screen.QuestionPreparation && dataStartQuestion && questionPage && <QuestionPlayerPreparation question={dataStartQuestion} pageData={questionPage} />}
            {screen === Data.Screen.Results && <Results players={players}/>}
          </div>
        </div>
      }
    </>
  )
}

export default Player


export const getStaticPaths = async () => ({ paths: [], fallback: false })
export const getStaticProps = async () => ({ props: {} })
