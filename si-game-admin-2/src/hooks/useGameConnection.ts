import { useCallback, useEffect, useRef } from "react"
import { client, hasErrorCode } from "@/client"
import { AckErrorCode, Event, Screen } from "@/data"
import { eventEmitter } from "@/eventEmitter"
import { useGameStore } from "@/store/game"
import { errorText, notifyError } from "@/utils/notify"
import { timeout } from "@/utils/utils"
import type {
  EventStartQuestion,
  EventStartResults,
  EventStartRoundName,
  EventStartTable,
  EventStartThemeList,
  EventStartThemeListInRound,
  EventUpdateMediaPlayer,
  EventUpdatePlayers,
  EventUpdateQuestionPage,
  EventUpdateScoreValue,
  PayloadStartQuestion,
  ResponseGetSettings,
} from "@/types"

export type GameRole = 'admin' | 'player'

const QUESTION_ANIMATION_MS = 1000

const store = () => useGameStore.getState()

const openNextGame = async (role: GameRole, previousGameId: string) => {
  let target = `/${role}`
  try {
    const games = await client.getGames()
    const next = games.filter(game => game.gameId !== previousGameId).at(-1)
    if (next) {
      target = `/${role}/${encodeURIComponent(next.gameId)}`
    }
  } catch {
  }
  window.location.assign(`${target}${window.location.search}`)
}

export const useGameConnection = (gameId: string | undefined, role: GameRole) => {
  const refreshRef = useRef<() => Promise<void>>(async () => undefined)

  useEffect(() => {
    if (!gameId) {
      return
    }
    if (store().gameId !== gameId) {
      store().reset(gameId)
    }

    let active = true
    let chain: Promise<void> = Promise.resolve()
    const enqueue = (task: () => void | Promise<void>) => {
      chain = chain
        .then(() => (active ? task() : undefined))
        .catch(error => console.error(error))
    }

    let settingsVersion = 0
    const loadSettings = async () => {
      const version = settingsVersion
      try {
        const settings = await client.getSettingsData()
        if (active && version === settingsVersion) {
          store().setSettings(settings)
        }
      } catch {
      }
    }

    const applySettings = (settings: ResponseGetSettings) => {
      settingsVersion += 1
      store().setSettings(settings)
    }

    const onScreenPush = <T>(apply: (data: T) => void | Promise<void>) => (data: T) => {
      enqueue(() => apply(data))
    }

    let loadSeq = 0
    const load = async ({ initial }: { initial: boolean }) => {
      const seq = ++loadSeq
      try {
        if (client.selectedGame !== gameId) {
          await client.selectGame(gameId)
        }
        const game = await client.getGame(gameId)
        if (seq !== loadSeq) {
          return
        }
        enqueue(() => store().applySnapshot(game))
        void loadSettings()
      } catch (error) {
        if (!active || seq !== loadSeq) {
          return
        }
        if (hasErrorCode(error, AckErrorCode.GameNotFound)) {
          store().setNotFound()
        } else if (initial || store().status !== 'ready') {
          store().setError(errorText(error))
        } else {
          notifyError(error, 'Не удалось обновить состояние игры')
        }
      }
    }

    let metaSeq = 0
    const refreshMeta = async () => {
      const seq = ++metaSeq
      try {
        const game = await client.getGame(gameId)
        if (active && seq === metaSeq) {
          store().updateMeta(game)
        }
      } catch {
      }
    }

    const startScreensaver = () => {
      store().startScreensaver()
      void refreshMeta()
    }

    const updateMedia = (data: EventUpdateMediaPlayer) => {
      store().setMedia(data)
      eventEmitter.emit('updateMediaPlayer', data)
    }

    const startQuestion = async (payload: PayloadStartQuestion, screen: Screen.Question | Screen.QuestionPreparation) => {
      if (role === 'player' && store().screen === Screen.Table) {
        store().setAnimatedQuestion(payload.id)
        await timeout(QUESTION_ANIMATION_MS)
        if (!active) {
          return
        }
      }
      store().startQuestion(payload, screen)
    }

    const unsubscribers = [
      client.on(Event.OnStartScreensaver, onScreenPush(startScreensaver)),
      client.on<EventStartQuestion>(Event.OnStartQuestion, onScreenPush(data => startQuestion(data.payload, Screen.Question))),
      client.on<EventStartQuestion>(Event.onStartQuestionPreparation, onScreenPush(data => startQuestion(data.payload, Screen.QuestionPreparation))),
      client.on<EventStartRoundName>(Event.OnStartRoundName, onScreenPush(data => store().startRoundName(data.payload))),
      client.on<EventStartTable>(Event.OnStartTable, onScreenPush(data => store().startTable(data.payload))),
      client.on<EventStartThemeList>(Event.OnStartThemeList, onScreenPush(data => store().startThemeList(data.payload))),
      client.on<EventStartThemeListInRound>(Event.OnStartThemeListInRound, onScreenPush(data => store().startThemeListInRound(data.payload))),
      client.on<EventStartResults>(Event.OnStartResults, onScreenPush(data => store().startResults(data.payload))),
      client.on<EventUpdateQuestionPage>(Event.OnUpdateQuestionPage, onScreenPush(data => store().updateQuestionPage(data.payload))),
      client.on<EventUpdatePlayers>(Event.OnUpdatePlayers, data => enqueue(() => store().updatePlayers(data))),
      client.on<EventUpdateScoreValue>(Event.OnUpdateScoreValue, data => enqueue(() => store().updateScoreValue(data.scoreValue))),
      client.on<ResponseGetSettings>(Event.OnUpdateSettings, applySettings),
      client.on<EventUpdateMediaPlayer>(Event.OnUpdateMediaPlayer, data => {
        if (role === 'player') {
          enqueue(() => updateMedia(data))
        }
      }),
      client.on(Event.OnExit, () => {
        active = false
        void openNextGame(role, gameId)
      }),
      client.onReconnect(() => {
        if (store().status !== 'notFound') {
          void load({ initial: store().status !== 'ready' })
        }
      }),
      client.subscribeStatus(() => {
        if (client.getStatus() === 'connected' && store().status === 'error') {
          void load({ initial: true })
        }
      }),
    ]

    refreshRef.current = () => load({ initial: false })
    void load({ initial: true })

    return () => {
      active = false
      refreshRef.current = async () => undefined
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, [gameId, role])

  const refresh = useCallback(() => refreshRef.current(), [])

  return { refresh }
}
