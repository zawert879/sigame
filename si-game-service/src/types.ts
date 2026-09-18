import type EventEmitter from 'eventemitter3'

export type * from '@common/types'
export type GameContainer = {
  id: string;
  eventEmitter: EventEmitter;
}
