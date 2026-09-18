import { create } from "zustand"
import { Screen } from "@/data"
import type {
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

// idle: no game requested yet; notFound: the server does not know the game id
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'notFound' | 'error'

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
  scoreValue: number
  progress: GameProgress | null
  isLastRound: boolean
  // volumes etc.: there is no push for settings, useGameConnection refetches them with the snapshot and on
  // screen / page / media pushes
  settings: ResponseGetSettings | null
  // player screen: the table cell that flashes before the question opens
  animatedQuestionId: string | null
  // bumped when the current question starts over, so the page (and its media) remounts from the beginning
  questionRun: number
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
  scoreValue: 0,
  progress: null,
  isLastRound: false,
  settings: null,
  animatedQuestionId: null,
  questionRun: 0,
})

const questionPageOf = (question: PayloadStartQuestion): PayloadQuestionPage => ({
  currentPage: question.currentPage,
  nextPage: question.nextPage,
  pageIndex: question.pageIndex,
  pagesCount: question.pagesCount,
})

// Single source of truth for a game screen (admin or player). Every update is a pure state transition.
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
    }
    // the snapshot carries the current selector only on the table / question screens
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

  startScreensaver: () => set({ screen: Screen.Screensaver }),

  startQuestion: (payload, screen) => set((state) => ({
    screen,
    question: payload,
    questionPage: questionPageOf(payload),
    currentSelector: payload.currentSelector,
    players: withCurrent(state.players, payload.currentSelector),
    animatedQuestionId: null,
    questionRun: state.questionRun + 1,
  })),

  startRoundName: (payload) => set({
    screen: Screen.RoundName,
    roundName: payload,
    progress: payload.progress,
  }),

  startTable: (payload) => set((state) => ({
    screen: Screen.Table,
    table: payload,
    progress: payload.progress,
    currentSelector: payload.currentSelector,
    players: withCurrent(state.players, payload.currentSelector),
  })),

  startThemeList: (payload) => set({ screen: Screen.ThemeList, themeList: payload }),

  startThemeListInRound: (payload) => set({ screen: Screen.ThemeListInRound, themeListInRound: payload }),

  startResults: (payload) => set((state) => ({
    screen: Screen.Results,
    results: payload,
    isLastRound: payload.isLastRound,
    progress: payload.progress,
    players: withCurrent(payload.players, state.currentSelector),
  })),

  updateQuestionPage: (payload) => set({ questionPage: payload }),

  updatePlayers: (update) => set((state) => ({
    currentSelector: update.currentSelector,
    players: withCurrent(mergePlayers(state.players, update), update.currentSelector),
  })),

  updateScoreValue: (scoreValue) => set({ scoreValue }),

  setSettings: (settings) => set((state) => ({
    settings,
    meta: state.meta ? { ...state.meta, scoreBig: settings.big, scoreLittle: settings.little } : state.meta,
  })),

  setAnimatedQuestion: (animatedQuestionId) => set({ animatedQuestionId }),

  restartQuestionMedia: () => set((state) => ({ questionRun: state.questionRun + 1 })),
}))

// 0..100 from the server settings → 0..1 for media elements; full volume until the settings are known.
export const toMediaVolume = (value: number | null | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 1
  }
  return Math.min(1, Math.max(0, value / 100))
}
