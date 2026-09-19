import { create } from "zustand"
import { Screen } from "@/data"
import type {
  EventUpdateMediaPlayer,
  EventUpdatePlayers,
  GameProgress,
  PayloadQuestionPage,
  PayloadStartQuestion,
  PayloadStartResults,
  PayloadStartRoundName,
  PayloadStartTable,
  PayloadStartThemeList,
  PayloadStartThemeListInRound,
  ResponseGetGame,
  ResponseGetSettings,
} from "@/types"
import { mergePlayers, withCurrent, type PlayerView } from "./players"

export type { PlayerView } from "./players"

export type GameMeta = {
  gameId: string
  gameName: string
  packageName: string | null
  scoreBig: number
  scoreLittle: number
}

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'notFound' | 'error'

export type MediaState = EventUpdateMediaPlayer & { receivedAt: number }

type GameData = {
  gameId: string | null
  status: LoadStatus
  error: string | null
  meta: GameMeta | null
  screen: Screen | null
  roundName: PayloadStartRoundName | null
  themeList: PayloadStartThemeList | null
  themeListInRound: PayloadStartThemeListInRound | null
  table: PayloadStartTable | null
  question: PayloadStartQuestion | null
  questionPage: PayloadQuestionPage | null
  results: PayloadStartResults | null
  players: PlayerView[]
  currentSelector: string | null
  answeredBy: string | null
  scoreValue: number
  progress: GameProgress | null
  isLastRound: boolean
  settings: ResponseGetSettings | null
  animatedQuestionId: string | null
  questionRun: number
  media: MediaState | null
}

type GameActions = {
  reset: (gameId: string | null) => void
  setNotFound: () => void
  setError: (message: string) => void
  applySnapshot: (game: ResponseGetGame) => void
  startScreensaver: () => void
  startQuestion: (payload: PayloadStartQuestion, screen: Screen.Question | Screen.QuestionPreparation) => void
  startRoundName: (payload: PayloadStartRoundName) => void
  startTable: (payload: PayloadStartTable) => void
  startThemeList: (payload: PayloadStartThemeList) => void
  startThemeListInRound: (payload: PayloadStartThemeListInRound) => void
  startResults: (payload: PayloadStartResults) => void
  updateQuestionPage: (payload: PayloadQuestionPage) => void
  updatePlayers: (update: EventUpdatePlayers) => void
  updateScoreValue: (scoreValue: number) => void
  setSettings: (settings: ResponseGetSettings) => void
  setAnimatedQuestion: (questionId: string | null) => void
  restartQuestionMedia: () => void
  updateMeta: (game: Pick<ResponseGetGame, 'gameId' | 'gameName' | 'packageName'>) => void
  setMedia: (media: EventUpdateMediaPlayer) => void
}

export type GameState = GameData & GameActions

const initialData = (gameId: string | null): GameData => ({
  gameId,
  status: gameId ? 'loading' : 'idle',
  error: null,
  meta: null,
  screen: null,
  roundName: null,
  themeList: null,
  themeListInRound: null,
  table: null,
  question: null,
  questionPage: null,
  results: null,
  players: [],
  currentSelector: null,
  answeredBy: null,
  scoreValue: 0,
  progress: null,
  isLastRound: false,
  settings: null,
  animatedQuestionId: null,
  questionRun: 0,
  media: null,
})

const questionPageOf = (question: PayloadStartQuestion): PayloadQuestionPage => ({
  currentPage: question.currentPage,
  nextPage: question.nextPage,
  pageIndex: question.pageIndex,
  pagesCount: question.pagesCount,
})

const answeredByAfter = (state: GameData, update: EventUpdatePlayers): string | null => {
  if (state.screen !== Screen.Question) {
    return null
  }
  let answeredBy = state.answeredBy
  for (const patch of update.updated) {
    const before = state.players.find(player => player.id === patch.id)
    if (!before) {
      continue
    }
    if (patch.win > before.win && patch.id === update.currentSelector) {
      answeredBy = patch.id
    } else if (patch.id === answeredBy && patch.lose > before.lose) {
      answeredBy = null
    }
  }
  return answeredBy && update.removed.includes(answeredBy) ? null : answeredBy
}

export const useGameStore = create<GameState>()((set) => ({
  ...initialData(null),

  reset: (gameId) => set(initialData(gameId)),

  setNotFound: () => set({ status: 'notFound', error: null }),

  setError: (message) => set({ status: 'error', error: message }),

  applySnapshot: (game) => set((state) => {
    const { screenData } = game
    const next: Partial<GameData> = {
      gameId: game.gameId,
      status: 'ready',
      error: null,
      meta: {
        gameId: game.gameId,
        gameName: game.gameName,
        packageName: game.packageName,
        scoreBig: game.scoreBig,
        scoreLittle: game.scoreLittle,
      },
      screen: screenData.screen,
      scoreValue: game.score,
      progress: game.progress,
      answeredBy: null,
      media: null,
    }
    let currentSelector = state.currentSelector
    switch (screenData.screen) {
      case Screen.Table:
        next.table = screenData.payload
        currentSelector = screenData.payload.currentSelector
        break
      case Screen.Question:
      case Screen.QuestionPreparation:
        next.question = screenData.payload
        next.questionPage = questionPageOf(screenData.payload)
        currentSelector = screenData.payload.currentSelector
        break
      case Screen.RoundName:
        next.roundName = screenData.payload
        break
      case Screen.ThemeList:
        next.themeList = screenData.payload
        break
      case Screen.ThemeListInRound:
        next.themeListInRound = screenData.payload
        break
      case Screen.Results:
        next.results = screenData.payload
        next.isLastRound = screenData.payload.isLastRound
        next.progress = screenData.payload.progress
        break
      default:
        break
    }
    next.currentSelector = currentSelector
    next.players = withCurrent(game.players, currentSelector)
    return next
  }),

  startScreensaver: () => set({ screen: Screen.Screensaver, media: null }),

  startQuestion: (payload, screen) => set((state) => ({
    screen,
    question: payload,
    questionPage: questionPageOf(payload),
    currentSelector: payload.currentSelector,
    answeredBy: null,
    players: withCurrent(state.players, payload.currentSelector),
    animatedQuestionId: null,
    questionRun: state.questionRun + 1,
    media: null,
  })),

  startRoundName: (payload) => set({
    screen: Screen.RoundName,
    roundName: payload,
    progress: payload.progress,
    media: null,
  }),

  startTable: (payload) => set((state) => ({
    screen: Screen.Table,
    table: payload,
    media: null,
    progress: payload.progress,
    currentSelector: payload.currentSelector,
    players: withCurrent(state.players, payload.currentSelector),
  })),

  startThemeList: (payload) => set({ screen: Screen.ThemeList, themeList: payload, media: null }),

  startThemeListInRound: (payload) => set({ screen: Screen.ThemeListInRound, themeListInRound: payload, media: null }),

  startResults: (payload) => set((state) => ({
    screen: Screen.Results,
    results: payload,
    media: null,
    isLastRound: payload.isLastRound,
    progress: payload.progress,
    players: withCurrent(payload.players, state.currentSelector),
  })),

  updateQuestionPage: (payload) => set((state) => ({
    questionPage: payload,
    answeredBy: payload.pageIndex === 0 ? null : state.answeredBy,
    media: null,
  })),

  updatePlayers: (update) => set((state) => ({
    currentSelector: update.currentSelector,
    answeredBy: answeredByAfter(state, update),
    players: withCurrent(mergePlayers(state.players, update), update.currentSelector),
  })),

  updateScoreValue: (scoreValue) => set({ scoreValue }),

  setSettings: (settings) => set((state) => ({
    settings,
    meta: state.meta ? { ...state.meta, scoreBig: settings.big, scoreLittle: settings.little } : state.meta,
  })),

  setAnimatedQuestion: (animatedQuestionId) => set({ animatedQuestionId }),

  restartQuestionMedia: () => set((state) => ({ questionRun: state.questionRun + 1, media: null })),

  updateMeta: (game) => set((state) => (
    state.meta && state.meta.gameId === game.gameId
      ? { meta: { ...state.meta, gameName: game.gameName, packageName: game.packageName } }
      : {}
  )),

  setMedia: (media) => set({ media: { time: media.time, isPlaying: media.isPlaying, receivedAt: Date.now() } }),
}))

export const mediaPosition = (media: MediaState, now = Date.now()): number =>
  media.isPlaying ? media.time + Math.max(0, now - media.receivedAt) / 1000 : media.time

export const toMediaVolume = (value: number | null | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 1
  }
  return Math.min(1, Math.max(0, value / 100))
}
