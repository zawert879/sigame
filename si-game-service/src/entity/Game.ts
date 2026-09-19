import EventEmitter from 'eventemitter3'
import fs from 'fs/promises'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { QuestionType, RoundType, Screen, siqDir } from '../data'
import { GameEvent } from '../events'
import type {
  EventUpdateMediaPlayer,
  EventUpdatePlayers,
  GameProgress,
  PayloadQuestionPage,
  PayloadStartQuestion,
  PayloadStartResults,
  PayloadStartTable,
  Player as PlayerType,
  ResponseGetGame,
  ResponseGetSettings,
} from '../types'
import { gameMediaDir, RM_OPTIONS } from '../utils/packages'
import { parseSIQ } from '../utils/parseSIQ'
import { MediaPlayer } from './MediaPlayer'
import { GameError } from './GameError'
import { Player } from './Player'
import type { Question } from './Question'
import { QueuePlayers } from './QueuePlayers'
import { Score } from './Score'
import { Settings } from './Settings'
import { SiqPackage } from './SiqPackage'

export type Events = {
  [GameEvent.UpdatePlayers]: (event: EventUpdatePlayers) => void;
  [GameEvent.QueuePlayersUpdated]: () => void;
  [GameEvent.StartScreensaver]: () => void;
  [GameEvent.StartQuestion]: () => void;
  [GameEvent.StartQuestionPreparation]: () => void;
  [GameEvent.StartRoundName]: () => void;
  [GameEvent.StartTable]: () => void;
  [GameEvent.StartThemeList]: () => void;
  [GameEvent.StartThemeListInRound]: () => void;
  [GameEvent.StartResults]: () => void;
  [GameEvent.UpdateScoreValue]: (value: number) => void;
  [GameEvent.UpdateSettings]: () => void;
  [GameEvent.UpdatePage]: () => void;
  [GameEvent.Exit]: () => void;
  [GameEvent.UpdateMediaPlayer]: (event: EventUpdateMediaPlayer) => void;
}

export type GameListeners = Partial<Events>

export type ScreenData = ResponseGetGame['screenData']

const screenEvents: Record<Screen, GameEvent | null> = {
  [Screen.Initial]: null,
  [Screen.Screensaver]: GameEvent.StartScreensaver,
  [Screen.ThemeList]: GameEvent.StartThemeList,
  [Screen.RoundName]: GameEvent.StartRoundName,
  [Screen.ThemeListInRound]: GameEvent.StartThemeListInRound,
  [Screen.Table]: GameEvent.StartTable,
  [Screen.QuestionPreparation]: GameEvent.StartQuestionPreparation,
  [Screen.Question]: GameEvent.StartQuestion,
  [Screen.Results]: GameEvent.StartResults,
}

export class Game {
  readonly id: string
  private readonly _eventEmitter = new EventEmitter()
  private _package: SiqPackage | null = null
  private readonly _score: Score
  private _currentSelector: string | null = null
  private readonly _settings: Settings
  private readonly _queuePlayers: QueuePlayers
  private readonly _mediaPlayer: MediaPlayer
  private _screen: Screen = Screen.Initial
  private readonly _name: string
  private _isButtonsActive = false
  private _isLoadingPack = false
  private _isClosed = false
  private readonly _players = new Map<string, Player>()

  constructor(name: string) {
    this.id = uuid()
    this._name = name

    const gameContainer = {
      eventEmitter: this._eventEmitter,
      id: this.id,
    }
    this._score = new Score(gameContainer)
    this._settings = new Settings()
    this._queuePlayers = new QueuePlayers(gameContainer)
    this._mediaPlayer = new MediaPlayer(this._eventEmitter)
  }

  public get package(): SiqPackage | null {
    return this._package
  }

  public get packageName(): string | null {
    return this._package?.name ?? null
  }

  public get mediaPlayer(): MediaPlayer {
    return this._mediaPlayer
  }

  public get name(): string {
    return this._name
  }

  public get screen(): Screen {
    return this._screen
  }

  public get score(): Score {
    return this._score
  }

  public get currentSelector(): string | null {
    return this._currentSelector
  }

  public get setting(): Settings {
    return this._settings
  }

  public get isButtonsActive(): boolean {
    return this._isButtonsActive
  }

  public get isClosed(): boolean {
    return this._isClosed
  }

  public get players(): Player[] {
    return [...this._players.values()]
  }

  public get playersWithQueue(): PlayerType[] {
    return this.players.map(player => this.playerData(player))
  }

  public get queuePlayersIds(): string[] {
    return this._queuePlayers.queue
  }

  public get packDir(): string {
    return gameMediaDir(this.id)
  }

  public get progress(): GameProgress {
    return this._package?.progress ?? {
      roundIndex: 0,
      roundsCount: 0,
      questionsPlayed: 0,
      questionsTotal: 0,
    }
  }

  public closeGame() {
    if (this._isClosed) {
      return
    }

    this._isClosed = true
    this._package?.close()
    this._eventEmitter.emit(GameEvent.Exit)
    this._eventEmitter.removeAllListeners()
  }

  public on<T extends EventEmitter.EventNames<Events>>(
    event: T,
    listener: EventEmitter.EventListener<Events, T>,
  ): this {
    this._eventEmitter.on(event, listener)
    return this
  }

  public off<T extends EventEmitter.EventNames<Events>>(
    event: T,
    listener: EventEmitter.EventListener<Events, T>,
  ): this {
    this._eventEmitter.off(event, listener)
    return this
  }

  public subscribe(listeners: GameListeners): void {
    for (const [event, listener] of Object.entries(listeners)) {
      this._eventEmitter.on(event, listener as (...args: unknown[]) => void)
    }
  }

  public unsubscribe(listeners: GameListeners): void {
    for (const [event, listener] of Object.entries(listeners)) {
      this._eventEmitter.off(event, listener as (...args: unknown[]) => void)
    }
  }

  public async startGame(file: string): Promise<void> {
    await this.loadPack(path.join(siqDir, file))
  }

  public async loadPack(filePath: string): Promise<void> {
    if (this._isClosed) {
      throw new GameError('Игра уже закрыта')
    }

    if (this._isLoadingPack) {
      throw new GameError('Пак уже загружается, подождите')
    }

    this._isLoadingPack = true
    try {
      const siq = parseSIQ(filePath)
      const siqPackage = new SiqPackage(siq)

      await fs.rm(this.packDir, RM_OPTIONS)
      await SiqPackage.saveAssets(siq, this.packDir)

      if (this._isClosed) {
        await fs.rm(this.packDir, RM_OPTIONS)
        throw new GameError('Игра уже закрыта')
      }

      this._package?.close()
      this._package = siqPackage
      this._isButtonsActive = false
      this._queuePlayers.clear()
      this._mediaPlayer.reset()
      this._score.setValue(0)
      this.setCurrentSelector(null)
      this.setScreen(Screen.Screensaver)
    } finally {
      this._isLoadingPack = false
    }
  }

  public next(): void {
    switch (this._screen) {
      case Screen.Screensaver: {
        this.setScreen(Screen.ThemeList)
        break
      }

      case Screen.ThemeList: {
        this.setScreen(Screen.RoundName)
        break
      }

      case Screen.RoundName: {
        this.setScreen(Screen.ThemeListInRound)
        break
      }

      case Screen.ThemeListInRound: {
        this.showTableOrResults()
        break
      }

      case Screen.QuestionPreparation: {
        this.startPreparedQuestion()
        break
      }

      case Screen.Question: {
        this.nextQuestionPage()
        break
      }

      case Screen.Results: {
        if (this._package && !this._package.isLastRound) {
          this.nextRound()
        }

        break
      }

      default: {
        break
      }
    }
  }

  public nextRound(): void {
    if (!this._package?.nextRound()) {
      return
    }

    this.leaveQuestion()
    this.setScreen(Screen.RoundName)
  }

  public previousRound(): void {
    if (!this._package) {
      return
    }

    this.leaveQuestion()
    this._package.previousRound()
    this.setScreen(Screen.RoundName)
  }

  public selectQuestion(questionId: string): void {
    if (!this._package) {
      throw new GameError('Пак не выбран')
    }

    const round = this._package.currentRound
    const question = round.questionById.get(questionId)
    if (!question) {
      throw new GameError('Вопрос не найден в текущем раунде')
    }

    if (this._screen !== Screen.Table || !question.isAvailable) {
      return
    }

    if (round.type === RoundType.FINAL) {
      if (round.themes.filter(theme => theme.hasAvailableQuestions).length > 1) {
        question.markPlayed()
        this.setScreen(Screen.Table)
        return
      }

      this.openQuestion(question)
      return
    }

    if (question.type !== QuestionType.DEFAULT) {
      this.prepareQuestion(question)
      return
    }

    this.openQuestion(question)
  }

  public repeatQuestion(): void {
    const question = this._package?.currentQuestion
    if (this._screen !== Screen.Question || !question) {
      return
    }

    question.restart()
    this._queuePlayers.clear()
    this._isButtonsActive = this.isButtonsQuestion(question)
    this._mediaPlayer.reset(true)
    this._eventEmitter.emit(GameEvent.UpdatePage)
  }

  public cancelQuestion(): void {
    if (this._screen !== Screen.Question && this._screen !== Screen.QuestionPreparation) {
      return
    }

    this.leaveQuestion()
    this.setScreen(Screen.Table)
  }

  public playerUsedButton(key: string) {
    const player = this.getPlayerByKey(key)
    if (player && this._isButtonsActive) {
      this._queuePlayers.addPlayer(player)
    }
  }

  public selectPlayer(id: string) {
    const player = this.getPlayer(id)
    if (!player) {
      return
    }

    if (this._screen === Screen.Question) {
      this._queuePlayers.addPlayer(player)
    } else if (this._screen === Screen.QuestionPreparation || this._screen === Screen.Table) {
      this.setCurrentSelector(player.id)
    }
  }

  public addPlayer(): Player {
    const player = new Player(changed => {
      this.pushPlayerUpdate(changed)
    })
    this._players.set(player.id, player)
    this._eventEmitter.emit(GameEvent.UpdatePlayers, {
      added: [this.playerData(player)],
      removed: [],
      updated: [],
      currentSelector: this._currentSelector,
    } satisfies EventUpdatePlayers)
    return player
  }

  public removePlayer(id: string) {
    this._players.delete(id)
    if (this._currentSelector === id) {
      this._currentSelector = null
    }

    this._queuePlayers.removePlayer(id)
    this._eventEmitter.emit(GameEvent.UpdatePlayers, {
      added: [],
      removed: [id],
      updated: [],
      currentSelector: this._currentSelector,
    } satisfies EventUpdatePlayers)
  }

  public updatePlayer(id: string, name: string, keyboardKey?: string) {
    const player = this.getPlayer(id)
    if (!player) {
      return
    }

    player.setName(name)
    if (keyboardKey) {
      player.setKeyboardKey(keyboardKey)
    }
  }

  public getPlayerByKey(key: string): Player | undefined {
    for (const player of this._players.values()) {
      if (player.keyboardKey === key) {
        return player
      }
    }

    return undefined
  }

  public getPlayer(id: string): Player | undefined {
    return this._players.get(id)
  }

  public winPlayer(id: string): void {
    const player = this._players.get(id)
    if (!player) {
      return
    }

    this._currentSelector = id
    player.win(this._score.value)
    this._isButtonsActive = false
    this._queuePlayers.clear()
    if (this._package?.currentQuestion?.goToAnswer()) {
      this._eventEmitter.emit(GameEvent.UpdatePage)
    }
  }

  public losePlayer(id: string): void {
    this._players.get(id)?.lose(this._score.value)
    this._queuePlayers.removePlayer(id)
  }

  public setCurrentSelector(playerId: string | null): void {
    this._currentSelector = playerId
    this._eventEmitter.emit(GameEvent.UpdatePlayers, {
      added: [],
      removed: [],
      updated: [],
      currentSelector: this._currentSelector,
    } satisfies EventUpdatePlayers)
  }

  public getAllThemes(): string[] {
    return this._package?.getAllThemes() ?? []
  }

  public getSnapshot(): ResponseGetGame {
    return {
      gameId: this.id,
      gameName: this._name,
      packageName: this.packageName,
      players: this.playersWithQueue,
      score: this._score.value,
      scoreBig: this._score.big,
      scoreLittle: this._score.little,
      progress: this.progress,
      screenData: this.getScreenData(),
    }
  }

  public setScoreLittle(value: number): void {
    this._score.setLittle(value)
    this._eventEmitter.emit(GameEvent.UpdateSettings)
  }

  public setScoreBig(value: number): void {
    this._score.setBig(value)
    this._eventEmitter.emit(GameEvent.UpdateSettings)
  }

  public setVolumeSettings(playerVolume: number, adminVolume: number): void {
    this._settings.playerVolume = playerVolume
    this._settings.adminVolume = adminVolume
    this._eventEmitter.emit(GameEvent.UpdateSettings)
  }

  public getSettings(): ResponseGetSettings {
    return {
      scoreValue: this._score.value,
      big: this._score.big,
      little: this._score.little,
      adminVolume: this._settings.adminVolume,
      playerVolume: this._settings.playerVolume,
    }
  }

  public getScreenData(): ScreenData {
    const screen = this._screen
    const round = this._package?.currentRound ?? null
    switch (screen) {
      case Screen.Question:
      case Screen.QuestionPreparation: {
        const question = this._package?.currentQuestion
        if (question) {
          return { screen, payload: this.getQuestionPayload(question) }
        }

        return { screen: Screen.Table, payload: this.getTablePayload() }
      }

      case Screen.Screensaver: {
        return { screen, payload: {} }
      }

      case Screen.ThemeList: {
        return { screen, payload: { themes: this.getAllThemes() } }
      }

      case Screen.RoundName: {
        return { screen, payload: { name: round?.name ?? '', progress: this.progress } }
      }

      case Screen.ThemeListInRound: {
        return { screen, payload: { themes: round?.themes.map(theme => theme.name) ?? [] } }
      }

      case Screen.Table: {
        return { screen, payload: this.getTablePayload() }
      }

      case Screen.Results: {
        return { screen, payload: this.getResultsPayload() }
      }

      default: {
        return { screen: Screen.Initial, payload: {} }
      }
    }
  }

  public getTablePayload(): PayloadStartTable {
    const round = this._package?.currentRound ?? null
    return {
      type: round?.type ?? RoundType.DEFAULT,
      themes: round?.themes.map(theme => ({
        name: theme.name,
        questions: theme.questions.map(question => ({
          id: question.id,
          isAvailable: question.isAvailable,
          price: question.price,
        })),
      })) ?? [],
      currentSelector: this._currentSelector,
      progress: this.progress,
    }
  }

  public getQuestionPayload(question: Question): PayloadStartQuestion {
    return {
      id: question.id,
      comments: question.comments,
      currentPage: question.currentPage,
      nextPage: question.nextPage,
      pageIndex: question.pageIndex,
      pagesCount: question.pagesCount,
      isAvailable: question.isAvailable,
      price: question.price,
      rightAnswer: question.rightAnswer,
      selectionMode: question.selectionMode,
      selectPrice: question.selectPrice,
      themeName: question.themeName,
      type: question.type,
      wrongAnswer: question.wrongAnswer,
      currentSelector: this._currentSelector,
      answerGroup: question.answerGroup,
      answerType: question.answerType,
    }
  }

  public getQuestionPagePayload(): PayloadQuestionPage {
    const question = this._package?.currentQuestion ?? null
    return {
      currentPage: question?.currentPage ?? null,
      nextPage: question?.nextPage ?? null,
      pageIndex: question?.pageIndex ?? 0,
      pagesCount: question?.pagesCount ?? 0,
    }
  }

  public getResultsPayload(): PayloadStartResults {
    return {
      players: this.playersWithQueue,
      isLastRound: this._package?.isLastRound ?? true,
      progress: this.progress,
    }
  }

  private playerData(player: Player): PlayerType {
    return {
      id: player.id,
      name: player.name,
      keyboardKey: player.keyboardKey,
      score: player.score,
      win: player.winCount,
      lose: player.loseCount,
      queue: this._queuePlayers.getPlayer(player.id),
    }
  }

  private pushPlayerUpdate(player: Player) {
    if (!this._players.has(player.id)) {
      return
    }

    this._eventEmitter.emit(GameEvent.UpdatePlayers, {
      added: [],
      removed: [],
      updated: [this.playerData(player)],
      currentSelector: this._currentSelector,
    } satisfies EventUpdatePlayers)
  }

  private setScreen(screen: Screen) {
    this._screen = screen
    const event = screenEvents[screen]
    if (event) {
      this._eventEmitter.emit(event)
    }
  }

  private showTableOrResults() {
    const round = this._package?.currentRound
    this.setScreen(round && !round.hasAvailableQuestions ? Screen.Results : Screen.Table)
  }

  private isButtonsQuestion(question: Question): boolean {
    return question.type === QuestionType.DEFAULT || this._package?.currentRound.type === RoundType.FINAL
  }

  private openQuestion(question: Question) {
    this._package?.setCurrentQuestion(question)
    question.restart()
    this._queuePlayers.clear()
    this._score.setValue(question.price)
    this._mediaPlayer.reset()
    this._isButtonsActive = true
    this.setScreen(Screen.Question)
  }

  private prepareQuestion(question: Question) {
    this._package?.setCurrentQuestion(question)
    question.restart()
    this._queuePlayers.clear()
    this._isButtonsActive = false
    this.setScreen(Screen.QuestionPreparation)
  }

  private startPreparedQuestion() {
    if (!this._package?.currentQuestion) {
      this.showTableOrResults()
      return
    }

    this._mediaPlayer.reset()
    this.setScreen(Screen.Question)
  }

  private nextQuestionPage() {
    const question = this._package?.currentQuestion
    if (!question) {
      this.showTableOrResults()
      return
    }

    if (question.goToNextPage()) {
      this._eventEmitter.emit(GameEvent.UpdatePage)
      return
    }

    question.markPlayed()
    this.leaveQuestion()
    this.showTableOrResults()
  }

  private leaveQuestion() {
    this._package?.currentQuestion?.restart()
    this._package?.setCurrentQuestion(null)
    this._isButtonsActive = false
    this._queuePlayers.clear()
  }
}
