import type EventEmitter from 'eventemitter3'
import { GameEvent } from '../events'
import type { EventUpdateMediaPlayer } from '../types'

export class MediaPlayer {
  private _eventEmitter: EventEmitter
  private readonly _now: () => number
  private _time = 0
  private _isPlaying = true
  private _updatedAt: number

  constructor(eventEmitter: EventEmitter, now: () => number = Date.now) {
    this._eventEmitter = eventEmitter
    this._now = now
    this._updatedAt = now()
  }

  public get time(): number {
    return this._time
  }

  public set time(value: number) {
    this.update(value, this._isPlaying)
  }

  public get isPlaying(): boolean {
    return this._isPlaying
  }

  public set isPlaying(value: boolean) {
    this.update(this._time, value)
  }

  public get state(): EventUpdateMediaPlayer {
    const elapsed = this._isPlaying ? Math.max(0, this._now() - this._updatedAt) / 1000 : 0
    return { time: this._time + elapsed, isPlaying: this._isPlaying }
  }

  public update(time: number, isPlaying: boolean) {
    this._time = time
    this._isPlaying = isPlaying
    this._updatedAt = this._now()
    this._eventEmitter.emit(GameEvent.UpdateMediaPlayer, { time: this._time, isPlaying: this._isPlaying })
  }

  public reset(force = false) {
    if (!force && this._isPlaying && this._time === 0) {
      this._updatedAt = this._now()
      return
    }

    this.update(0, true)
  }
}
