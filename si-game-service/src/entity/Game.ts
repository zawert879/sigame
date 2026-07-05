import EventEmitter from 'eventemitter3'
import { parseSIQ } from '../utils/parseSIQ'
import { Player } from './Player'
import { SiqPackage } from './SiqPackage'
import { v4 as uuid } from 'uuid'
import { Question } from './Question'
import bind from 'bind-decorator'
import { GameEvent } from '../events'
import { EventUpdateMediaPlayer, EventUpdatePlayers, Player as PlayerType } from '../types'
import { QuestionType, RoundType, Screen } from '../data'
import { Score } from './Score'
import { QueuePlayers } from './QueuePlayers'
import { MediaPlayer } from './MediaPlayer'
import { Settings } from './Settings'

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
  [GameEvent.UpdatePage]: () => void;
  [GameEvent.Exit]: () => void;
  [GameEvent.UpdateMediaPlayer]: (event: EventUpdateMediaPlayer) => void;
}

export class Game {
  readonly id: string
  private _eventEmitter = new EventEmitter()
  private _package: SiqPackage | null
  private _score: Score
  private _currentSelector: string | null = null
  private _settings: Settings
  private _queuePlayers: QueuePlayers
  private _mediaPlayer: MediaPlayer = new MediaPlayer(this._eventEmitter)
  private _screen: Screen = Screen.Initial
  private _name: string
  private _isStartPack = true
  private _isButtonsActive = false

  public get package(): SiqPackage | null {
    return this._package
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

  private _players = new Map<string, Player>()
  public get players(): Player[] {
    return [...this._players.values()]
  }

  public get playersWithQueue(): PlayerType[] {
    const result = []
    for (const player of this._players.values()) {
      const playerInQueue = this._queuePlayers.getPlayer(player.id)
      result.push({
        id: player.id,
        name: player.name,
        keyboardKey: player.keyboardKey,
        score: player.score,
        win: player.winCount,
        lose: player.loseCount,
        queue: playerInQueue,
      })
    }

    return result
  }

  public get queuePlayersIds(): string[] {
    return this._queuePlayers.queue
  }

  constructor(name: string) {
    this.id = uuid()
    this._package = null
    this._name = name

    this.sub()
    const gameContainer = {
      eventEmitter: this._eventEmitter,
      id: this.id,
    }
    this._score = new Score(gameContainer)
    this._settings = new Settings()
    this._queuePlayers = new QueuePlayers(gameContainer)
  }

  public closeGame() {
    this.unSub()
    this._eventEmitter.emit(GameEvent.Exit)
  }

  public on<T extends EventEmitter.EventNames<Events>>(
    event: T,
    listener: EventEmitter.EventListener<Events, T>,
  ): this {
    this._eventEmitter.on(event, listener)

    // console.log('listenerCount ON: ', event, this._eventEmitter.listenerCount(event))

    return this
  }

  public off<T extends EventEmitter.EventNames<Events>>(
    event: T,
    listener: EventEmitter.EventListener<Events, T>,
  ): this {
    this._eventEmitter.off(event, listener)
    // console.log('listenerCount OFF : ', event, this._eventEmitter.listenerCount(event))

    return this
  }

  public next(): void {
    if (this._screen === Screen.Screensaver) {
      if (this._isStartPack) {
        this._screen = Screen.ThemeList
        this._eventEmitter.emit(GameEvent.StartThemeList)
        return
      }

      this._screen = Screen.RoundName
      this._eventEmitter.emit(GameEvent.StartRoundName)
      return
    }

    if (this._screen === Screen.ThemeListInRound) {
      this._screen = Screen.Table
      this._eventEmitter.emit(GameEvent.StartTable)
      return
    }

    if (this._screen === Screen.RoundName) {
      this._screen = Screen.ThemeListInRound
      this._eventEmitter.emit(GameEvent.StartThemeListInRound)
      return
    }

    if (this._screen === Screen.Results) {
      this.package?.nextRound()
      return
    }

    if (this._screen === Screen.ThemeList) {
      this._screen = Screen.RoundName
      this._eventEmitter.emit(GameEvent.StartRoundName)
      return
    }

    if (this._screen === Screen.QuestionPreparation) {
      this._screen = Screen.Question
      this._eventEmitter.emit(GameEvent.StartQuestion)
      return
    }

    if (this._screen === Screen.Question) {
      this.package?.currentQuestion?.enter()
    }
  }

  public playerUsedButton(key: string) {
    const player = this.getPlayerByKey(key)
    if (player && this._isButtonsActive) {
      this._queuePlayers.addPlayer(player)
    }
  }

  public selectPlayer(id: string) {
    const player = this.getPlayer(id)
    if (player) {
      this._queuePlayers.addPlayer(player)
    }
  }

  public startGame(file: string) {
    const siq = parseSIQ(`./siq/${file}`)

    this._package = new SiqPackage(siq, {
      eventEmitter: this._eventEmitter,
      id: this.id,
    })
    this._screen = Screen.Screensaver
    this._eventEmitter.emit(GameEvent.StartScreensaver)
  }

  public addPlayer() {
    const player = new Player({
      eventEmitter: this._eventEmitter,
      id: this.id,
    })
    this._players.set(player.id, player)
    this._eventEmitter.emit(GameEvent.UpdatePlayers, {
      added: [{
        id: player.id,
        name: player.name,
        keyboardKey: '',
        lose: player.loseCount,
        win: player.winCount,
        queue: 0,
        score: player.score,
      }],
      removed: [],
      updated: [],
      currentSelector: this._currentSelector,
    } as EventUpdatePlayers)
  }

  public removePlayer(id: string) {
    this._players.delete(id)
    this._eventEmitter.emit(GameEvent.UpdatePlayers, {
      added: [],
      removed: [id],
      updated: [],
      currentSelector: this._currentSelector,
    } as EventUpdatePlayers)
  }

  public getPlayerByKey(key: string): Player | undefined {
    for (const player of this._players.values()) {
      if (player.keyboardKey === key) {
        return player
      }
    }
  }

  public getPlayer(id: string): Player | undefined {
    return this._players.get(id)
  }

  public winPlayer(id: string): void {
    const { value } = this.score
    this._players.get(id)?.win(value)
    this._package?.currentQuestion?.goToAnswer()
    this._currentSelector = id
  }

  public losePlayer(id: string): void {
    const { value } = this.score
    this._players.get(id)?.lose(value)
    this._queuePlayers.removePlayer(id)
  }

  public setCurrentSelector(playerId: string | null): void {
    this._currentSelector = playerId
    this._eventEmitter.emit(GameEvent.UpdatePlayers, {
      added: [],
      removed: [],
      updated: [],
      currentSelector: this._currentSelector,
    } as EventUpdatePlayers)
  }

  public getAllThemes(): string[] {
    if (this._package) {
      const themes: string[] = []
      for (const round of this._package.rounds) {
        for (const theme of round.themes) {
          themes.push(theme.name)
        }
      }

      return themes
    }

    return []
  }

  @bind
  private onNextRound(): void {
    if (this.package && this.package.rounds.length > this.package.roundIndex) {
      this._screen = Screen.RoundName
      this._eventEmitter.emit(GameEvent.StartRoundName)
    }
  }

  @bind
  private onPreviousRound(): void {
    this._screen = Screen.RoundName
    this._eventEmitter.emit(GameEvent.StartRoundName)
  }

  @bind
  private onOpenQuestion(question: Question) {
    const currentRound = this.package?.getCurrentRound()
    if(currentRound && currentRound.type === RoundType.FINAL) {
      if(currentRound.themes.filter(t => t.questions.some(q => q.isClose)).length === 1) {
        this._screen = Screen.Question
        this.score.setValue(question.price)
        this.mediaPlayer.reset()
        process.nextTick(() => {
          this._isButtonsActive = true
          this._eventEmitter.emit(GameEvent.StartQuestion)
        })
        return
      }
      question.close()
      process.nextTick(() => {
        this._eventEmitter.emit(GameEvent.StartTable)
      })
      return
    }
    if (question.type !== QuestionType.DEFAULT) {
      this._screen = Screen.QuestionPreparation
      process.nextTick(() => {
        this._eventEmitter.emit(GameEvent.StartQuestionPreparation)
      })
      return
    }

    this._screen = Screen.Question
    this.score.setValue(question.price)
    this.mediaPlayer.reset()
    process.nextTick(() => {
      this._isButtonsActive = true
      this._eventEmitter.emit(GameEvent.StartQuestion)
    })
  }

  @bind
  private onCloseQuestion() {
    this._isButtonsActive = false
    this._queuePlayers.clear()
    this._screen = Screen.Table
    this._eventEmitter.emit(GameEvent.StartTable)
  }

  @bind
  private onStartResultsOnCloseAllQuestions() {
    this._screen = Screen.Results
    this._eventEmitter.emit(GameEvent.StartResults)
  }

  private sub() {
    this._eventEmitter.on(GameEvent.OpenQuestion, this.onOpenQuestion)
    this._eventEmitter.on(GameEvent.CloseQuestion, this.onCloseQuestion)
    this._eventEmitter.on(GameEvent.NextRound, this.onNextRound)
    this._eventEmitter.on(GameEvent.PreviousRound, this.onPreviousRound)
    this._eventEmitter.on(GameEvent.StartResultsOnCloseAllQuestions, this.onStartResultsOnCloseAllQuestions)
  }
  
  private unSub() {
    this._eventEmitter.off(GameEvent.OpenQuestion, this.onOpenQuestion)
    this._eventEmitter.off(GameEvent.CloseQuestion, this.onCloseQuestion)
    this._eventEmitter.off(GameEvent.NextRound, this.onNextRound)
    this._eventEmitter.off(GameEvent.PreviousRound, this.onPreviousRound)
    this._eventEmitter.off(GameEvent.StartResultsOnCloseAllQuestions, this.onStartResultsOnCloseAllQuestions)
  }
}
