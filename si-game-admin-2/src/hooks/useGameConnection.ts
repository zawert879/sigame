import { useCallback, useEffect, useRef } from "react"
import Router from "next/router"
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
} from "@/types"

export type GameRole = 'admin' | 'player'

// Player screen: the selected cell flashes on the table before the question is shown.
const QUESTION_ANIMATION_MS = 1000

const store = () => useGameStore.getState()

// Connects a screen to a game: selects it, loads the snapshot (getGame), applies server pushes to the game store and
// reloads the snapshot after every reconnect. Returns `refresh` to reload the snapshot on demand.
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
    // Pushes (and snapshots) are applied strictly in arrival order, even when one of them waits for an animation.
    let chain: Promise<void> = Promise.resolve()
    const enqueue = (task: () => void | Promise<void>) => {
      chain = chain
        .then(() => (active ? task() : undefined))
        .catch(error => console.error(error))
    }

    // Settings (volumes, quick scores) have no push of their own: they are refetched with every snapshot and on every
    // push that changes what the screen shows or plays (screens, question pages, the host's media controls), so a new
    // volume reaches the player screen with the next screen, page or play/pause/seek.
    const loadSettings = async () => {
      try {
        const settings = await client.getSettingsData()
        if (active) {
          store().setSettings(settings)
        }
      } catch {
        // volumes keep their previous values; the next push retries
      }
    }

    // a push of a new screen or page: refetch the settings right away (parallel to the queue, so the sounds and media
    // of the new screen get the current volumes as soon as possible), then apply the push in order
    const onScreenPush = <T>(apply: (data: T) => void | Promise<void>) => (data: T) => {
      void loadSettings()
      enqueue(() => apply(data))
    }

    // selects the game unless this connection already has it selected, then loads the snapshot;
    // only the latest load may update the store (an older one can time out after a reconnect)
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
      client.on(Event.OnStartScreensaver, onScreenPush(() => store().startScreensaver())),
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
      client.on<EventUpdateMediaPlayer>(Event.OnUpdateMediaPlayer, data => {
        // only the player screen follows the host's media controls; the admin player is the source of them
        if (role === 'player') {
          eventEmitter.emit('updateMediaPlayer', data)
          void loadSettings()
        }
      }),
      client.on(Event.OnExit, () => {
        void Router.push('/')
      }),
      // the client has already re-selected the game (or forgot it if that failed): reload the snapshot
      client.onReconnect(() => {
        if (store().status !== 'notFound') {
          void load({ initial: store().status !== 'ready' })
        }
      }),
      // the first load failed (e.g. the server was down): retry as soon as the connection is up
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
