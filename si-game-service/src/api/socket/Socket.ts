import type * as SocketIO from 'socket.io'
import { type DefaultEventsMap } from 'socket.io/dist/typed-events'
import { type Dao } from '../../types'

export class Socket {
  constructor(private readonly socket: SocketIO.Socket<DefaultEventsMap, DefaultEventsMap>) {}

  public get id() {
    return this.socket.id
  }

  public get socketIo() {
    return this.socket
  }

  public async send(dao: Dao) {
    return this.socket.emit(dao.type, dao.payload)
  }

  public async sendToAll(dao: Dao) {
    return Promise.all([
      this.socket.emit(dao.type, dao.payload),
      this.socket.broadcast.emit(dao.type, dao.payload),
    ])
  }

  public async sendToOther(dao: Dao) {
    return this.socket.broadcast.emit(dao.type, dao.payload)
  }
}
