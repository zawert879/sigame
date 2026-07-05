import React, { useCallback, useEffect, useState } from "react"
import { EventExit, EventStartQuestion, EventStartRoundName, EventStartScreensaver, EventStartTable, EventStartThemeList, EventStartThemeListInRound, EventUpdateMediaPlayer, EventUpdatePlayers, EventUpdateQuestionPage, PayloadQuestionPage, PayloadStartQuestion, PayloadStartRoundName, PayloadStartTable, PayloadStartThemeList, PayloadStartThemeListInRound, Player, ResponseGetGame } from "@/types"
import { useRouter } from "next/router"
import { client } from "@/client"
import { GameInit } from "@/components/initial/GameInit"
import * as Data from "@/data"
import { Menu } from "@/components/menu/Menu"
import { ScoreManager } from "@/components/ScoreManager"
import { PlayerTable } from "@/components/admin/PlayerTable"
import { Screensaver } from "@/components/admin/Screensaver"
import ThemesList from "@/components/admin/ThemesList"
import ThemeRound from "@/components/admin/ThemeRound"
import { QuestionTable } from "@/components/QuestionTable"
import { QuestionAdmin } from "@/components/admin/QuestionAdmin"
import { QuestionPlayerPreparation } from "@/components/question/QuestionPlayerPreparation"
import { Results } from "@/components/Results"

const Home = () => {
  const [game, setGame] = useState<ResponseGetGame>()
  const [players, setPlayers] = useState<(Player & { isCurrent: boolean })[]>([])
  const [questionPage, setQuestionPage] = useState<PayloadQuestionPage>()
  const [screen, setScreen] = useState<Data.Screen>()
  const [dataStartRoundName, setDataStartRoundName] = useState<PayloadStartRoundName>()
  const [dataStartThemeList, setDataStartThemeList] = useState<PayloadStartThemeList>()
  const [dataStartThemeListInRound, setDataStartThemeListInRound] = useState<PayloadStartThemeListInRound>()
  const [dataStartTable, setDataStartTable] = useState<PayloadStartTable>()
  const [dataStartQuestion, setDataStartQuestion] = useState<PayloadStartQuestion>()
  const router = useRouter()

  const fetchGames = useCallback(async () => {
    if (router.query.id && !Array.isArray(router.query.id)) {
      const game = await client.getGame(router.query.id)
      if (game) {
        await client.selectGame(game.gameId)
        setGame(game)
        setPlayers(game.players.map(p => ({ ...p, isCurrent: false })))
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
        }
        if (game.screenData.screen === Data.Screen.ThemeList) {
          setDataStartThemeList(game.screenData.payload)
        }
        if (game.screenData.screen === Data.Screen.ThemeListInRound) {
          setDataStartThemeListInRound(game.screenData.payload)
        }
        if (game.screenData.screen === Data.Screen.Table) {
          setDataStartTable(game.screenData.payload)
          const currentSelector = game.screenData.payload.currentSelector
          setPlayers(game.players.map(p => ({ ...p, isCurrent: p.id === currentSelector })))
        }
      }
    }
  }, [router.query.id])

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
  const onStartQuestionPreparation = useCallback((data: EventStartQuestion) => {
    if (game) {
      setScreen(Data.Screen.QuestionPreparation)
      setDataStartQuestion(data.payload)
      setQuestionPage({
        currentPage: data.payload.currentPage,
        nextPage: data.payload.nextPage,
      })
    }
  }, [game])
  const onStartQuestion = useCallback((data: EventStartQuestion) => {
    if (game) {
      setScreen(Data.Screen.Question)
      setDataStartQuestion(data.payload)
      setQuestionPage({
        currentPage: data.payload.currentPage,
        nextPage: data.payload.nextPage,
      })
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
      setScreen(Data.Screen.Table)
      setDataStartTable(data.payload)
      setPlayers(players.map(p => ({ ...p, isCurrent: p.id === data.payload.currentSelector })))
    }
  }, [game])
  const onStartThemeList = useCallback((data: EventStartThemeList) => {
    if (game) {
      setScreen(Data.Screen.ThemeList)
      setDataStartThemeList(data.payload)
    }
  }, [game])
  const onStartThemeListInRound = useCallback((data: EventStartThemeListInRound) => {
    if (game) {
      setScreen(Data.Screen.ThemeListInRound)
      setDataStartThemeListInRound(data.payload)
    }
  }, [game])
  const onUpdateQuestionPage = useCallback((data: EventUpdateQuestionPage) => {
    if (game) {
      setQuestionPage(data.payload)
    }
  }, [game])
  const onExit = useCallback((data: EventExit) => {
    router.push('/')
  }, [router])
  const onUpdateMediaPlayer = useCallback((data: EventUpdateMediaPlayer) => {
    console.log('onUpdateMediaPlayer', data)
  }, [])
  const onUpdatePlayer = useCallback((data: EventUpdatePlayers) => {
    let buff = [...players]
    for (const player of data.added) {
      buff.push({ ...player, isCurrent: player.id === data.currentSelector})
    }

    buff = buff.filter(player => {
      return !data.removed.includes(player.id)
    })

    for (const player of buff) {
      const found = data.updated.find(p => p.id === player.id)
      if (found) {
        player.keyboardKey = found.keyboardKey
        player.name = found.name
        player.lose = found.lose
        player.win = found.win
        player.score = found.score
        player.queue = found.queue
      }
      if(player.id === data.currentSelector){
        player.isCurrent = true
      } else {
        player.isCurrent = false
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
      client.socket.socketIo.off(Data.Event.OnUpdateQuestionPage, onUpdateQuestionPage)
      client.socket.socketIo.off(Data.Event.OnUpdatePlayers, onUpdatePlayer)
      client.socket.socketIo.off(Data.Event.OnExit, onExit)
      client.socket.socketIo.off(Data.Event.OnUpdateMediaPlayer, onUpdateMediaPlayer)

    }
  }, [onUpdateQuestionPage, onChangeScreen, onStartQuestion, onStartRoundName, onStartTable, onStartThemeList, onStartThemeListInRound, onUpdatePlayer, onExit, onStartQuestionPreparation])

  return (
    <>
      {!game && <div className="bg-blue-700 h-[92vh] lg:h-[100vh] flex flex-col justify-center items-center w-screen">
        <h1>Игра не найдена</h1>
      </div>}
      {game && screen === Data.Screen.Initial && <div className="bg-blue-700 h-[92vh] lg:h-[100vh] flex flex-col justify-center items-center w-screen">
        <GameInit game={game} forceRefreshCb={forceRefreshCb} />
      </div>}
      {game && screen !== Data.Screen.Initial &&
        <div className="overflow-hidden h-[92vh] lg:h-[100vh]">
          <div className="flex justify-center">
            <p className=" h-6 w-full text-center bg-yellow-300">{screen}</p>
          </div>
          <div className="h-[600px] bg-blue-700">
            {screen === Data.Screen.Screensaver && <Screensaver />}
            {screen === Data.Screen.ThemeList && dataStartThemeList && <ThemesList themes={dataStartThemeList.themes} />}
            {screen === Data.Screen.ThemeListInRound && dataStartThemeListInRound && <ThemesList themes={dataStartThemeListInRound.themes} />}
            {screen === Data.Screen.RoundName && dataStartRoundName && <ThemeRound themeName={dataStartRoundName.name} />}
            {screen === Data.Screen.Table && dataStartTable && <QuestionTable data={dataStartTable} animateSelectQuestion={null} />}
            {screen === Data.Screen.QuestionPreparation && dataStartQuestion && questionPage && <QuestionAdmin question={dataStartQuestion} pageData={questionPage} isPreparation={true} />}

            {screen === Data.Screen.Question && dataStartQuestion && questionPage && <QuestionAdmin question={dataStartQuestion} pageData={questionPage} isPreparation={false} />}
            {screen === Data.Screen.Results && <Results players={players} />}

          </div>
          <Menu forceRefreshCb={forceRefreshCb} />
          <ScoreManager defaultScore={game.score} big={game.scoreBig} little={game.scoreLittle} />
          <PlayerTable players={players} />
        </div>
      }
    </>
  )
}

export default Home


export const getStaticPaths = async () => ({ paths: [], fallback: false })
export const getStaticProps = async () => ({ props: {} })
