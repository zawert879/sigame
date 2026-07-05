import { v4 as uuid } from 'uuid'
import { type EventUpdatePlayers, type GameContainer } from '../types'
import { GameEvent } from '../events'

export class Player {
  public readonly id = uuid()

  private _name = ''
  private _keyboardKey = ''
  private _winCount = 0
  private _loseCount = 0
  private _score = 0
  private _eventEmitter
  constructor(gameContainer: GameContainer) {
    this._eventEmitter = gameContainer.eventEmitter
  }

  public get name(): string {
    return this._name
  }

  public setName(value: string) {
    this._name = value
    this.sendUpdatePlayer()
  }

  public setKeyboardKey(value: string) {
    this._keyboardKey = value
    this.sendUpdatePlayer()
  }

  get winCount(): number {
    return this._winCount
  }

  get keyboardKey(): string {
    return this._keyboardKey
  }

  get loseCount(): number {
    return this._loseCount
  }

  get score(): number {
    return this._score
  }

  public win(value: number) {
    this._winCount += 1
    this._score += value
    this.sendUpdatePlayer()
  }

  public lose(value: number) {
    this._loseCount += 1
    this._score -= value
    this.sendUpdatePlayer()
  }

  public setLose(value: number) {
    this._loseCount = value
    this.sendUpdatePlayer()
  }

  public setWin(value: number) {
    this._winCount = value
    this.sendUpdatePlayer()
  }

  public setScore(value: number) {
    this._score = value
    this.sendUpdatePlayer()
  }

  private sendUpdatePlayer() {
    this._eventEmitter.emit(GameEvent.UpdatePlayers, {
      added: [],
      removed: [],
      updated: [{
        id: this.id,
        name: this._name,
        keyboardKey: this._keyboardKey,
        score: this.score,
        lose: this.loseCount,
        queue: null,
        win: this.winCount,
      }],
      currentSelector: null, // хреновая идея, подпер костыль оверайдом в контроллере
    } as EventUpdatePlayers)
  }
}

