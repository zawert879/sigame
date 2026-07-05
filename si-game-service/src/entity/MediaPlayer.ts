import type EventEmitter from 'eventemitter3'
import { GameEvent } from '../events'

export class MediaPlayer {
  private _eventEmitter: EventEmitter
  private _time = 0
  private _isPlaying = true

  constructor(eventEmitter: EventEmitter) {
    this._eventEmitter = eventEmitter
  }

  public get time(): number {
    return this._time
  }

  public set time(value: number) {
    this._time = value
    this._eventEmitter.emit(GameEvent.UpdateMediaPlayer, { time: this._time, isPlaying: this._isPlaying })
  }

  public get isPlaying(): boolean {
    return this._isPlaying
  }

  public set isPlaying(value: boolean) {
    this._isPlaying = value
    this._eventEmitter.emit(GameEvent.UpdateMediaPlayer, { time: this._time, isPlaying: this._isPlaying })
  }

  public update(time: number, isPlaying: boolean) {
    this._time = time
    this._isPlaying = isPlaying
    this._eventEmitter.emit(GameEvent.UpdateMediaPlayer, { time: this._time, isPlaying: this._isPlaying })
  }

  public reset() {
    if (!this._isPlaying && this._time === 0) {
      return
    }

    this._time = 0
    this._isPlaying = true
    this._eventEmitter.emit(GameEvent.UpdateMediaPlayer, { time: this._time, isPlaying: this._isPlaying })
  }
}
