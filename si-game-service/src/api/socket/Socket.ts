import type * as SocketIO from 'socket.io'
import { type Dao } from '../../types'

export class Socket {
  constructor(private readonly socket: SocketIO.Socket) {}

  public get id() {
    return this.socket.id
  }

  public get socketIo() {
    return this.socket
  }

  // auth.token sent by the client on connection (socket.io `auth` option)
  public get authToken(): unknown {
    const { auth } = this.socket.handshake as { auth: unknown }
    return typeof auth === 'object' && auth !== null ? (auth as Record<string, unknown>).token : undefined
  }

  public send(dao: Dao): void {
    this.socket.emit(dao.type, dao.payload)
  }
}
