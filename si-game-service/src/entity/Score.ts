import { GameEvent } from '../events'
import { type GameContainer } from '../types'
import type EventEmitter from 'eventemitter3'

export class Score {
  private _eventEmitter: EventEmitter
  private _value = 0
  private _little = 20
  private _big = 100

  public get value(): number {
    return this._value
  }

  public get little(): number {
    return this._little
  }

  public get big(): number {
    return this._big
  }

  constructor(gameContainer: GameContainer) {
    this._eventEmitter = gameContainer.eventEmitter
  }

  littlePlus() {
    this.setValue(this._value + this._little)
  }

  bigPlus() {
    this.setValue(this._value + this._big)
  }

  littleMinus() {
    this.setValue(this._value - this._little)
  }

  bigMinus() {
    this.setValue(this._value - this._big)
  }

  setLittle(value: number) {
    this._little = value
  }

  setBig(value: number) {
    this._big = value
  }

  setValue(value: number) {
    this._value = value
    this._eventEmitter.emit(GameEvent.UpdateScoreValue, value)
  }
}

