import type EventEmitter from 'eventemitter3'

import { type Player } from './Player'
import { type GameContainer } from '../types'
import { GameEvent } from '../events'

export class QueuePlayers {
  private _eventEmitter: EventEmitter
  private _queue: string[] = []

  constructor(gameContainer: GameContainer) {
    this._eventEmitter = gameContainer.eventEmitter
  }

  public get queue() {
    return [...this._queue]
  }

  public addPlayer(player: Player) {
    console.log(this.queue)
    if (!this._queue.includes(player.id)) {
      this._queue.push(player.id)
      this._eventEmitter.emit(GameEvent.QueuePlayersUpdated)
    }
  }

  public getPlayer(playerId: string): number | null {
    const result = this._queue.findIndex(id => playerId === id)
    if (result === -1) {
      return null
    }

    return result
  }

  public clear() {
    this._queue = []
    this._eventEmitter.emit(GameEvent.QueuePlayersUpdated)
  }

  public removePlayer(id: string) {
    const index = this._queue.indexOf(id)
    if (index > -1) {
      this._queue.splice(index, 1)
      this._eventEmitter.emit(GameEvent.QueuePlayersUpdated)
    }
  }
}
