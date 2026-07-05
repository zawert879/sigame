import type * as SocketIO from 'socket.io-client'
import { Event, SystemEvent } from '../data'
import { type Dao } from '../types'
import bind from 'bind-decorator'

export class Socket {
  constructor(private readonly socket: SocketIO.Socket) {
  }

  public get id() {
    return this.socket.id
  }

  public get socketIo() {
    return this.socket
  }

  public async send<T>(dao: Dao): Promise<T> {
    return this.socket.emitWithAck(dao.type, dao.payload)
  }
  public async handshake() {
    return this.socket.emit(SystemEvent.Handshake, '4324234')
  }
}
