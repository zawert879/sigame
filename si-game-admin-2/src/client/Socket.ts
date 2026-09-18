import type * as SocketIO from 'socket.io-client'
import { type Dao } from '../types'
import { ClientErrorCode, RequestError, isAckError } from './errors'

export const DEFAULT_REQUEST_TIMEOUT = 15_000

export class Socket {
  constructor(private readonly socket: SocketIO.Socket) {
  }

  public get id() {
    return this.socket.id
  }

  public get socketIo() {
    return this.socket
  }

  public get connected() {
    return this.socket.connected
  }

  // Sends a request and waits for its ack. Rejects with RequestError on an AckError response or on timeout.
  public async send<T>(dao: Dao, timeoutMs: number = DEFAULT_REQUEST_TIMEOUT): Promise<T> {
    let response: unknown
    try {
      response = await this.socket.timeout(timeoutMs).emitWithAck(dao.type, dao.payload)
    } catch {
      throw new RequestError(this.socket.connected ? ClientErrorCode.Timeout : ClientErrorCode.Disconnected)
    }
    if (isAckError(response)) {
      throw RequestError.fromAck(response)
    }
    return response as T
  }
}
