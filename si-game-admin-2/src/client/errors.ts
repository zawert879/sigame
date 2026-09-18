import { AckErrorCode } from '../data'
import type { AckError } from '../types'

// Errors produced on the client side (no ack from the server).
export enum ClientErrorCode {
  Timeout = 'TIMEOUT',
  Disconnected = 'DISCONNECTED',
}

export type RequestErrorCode = AckErrorCode | ClientErrorCode

const ackErrorCodes = new Set<string>(Object.values(AckErrorCode))

export const isAckError = (value: unknown): value is AckError => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const error = (value as { error?: unknown }).error
  return typeof error === 'string' && ackErrorCodes.has(error)
}

const describe = (code: RequestErrorCode, serverMessage?: string): string => {
  switch (code) {
    case AckErrorCode.GameNotFound:
      return 'Игра не найдена'
    case AckErrorCode.GameNotSelected:
      return 'Игра не выбрана — обновите страницу'
    case AckErrorCode.Unauthorized:
      return 'Нет доступа: откройте ссылку ведущего с токеном (?token=…)'
    case AckErrorCode.InvalidPayload:
      return serverMessage ? `Некорректный запрос: ${serverMessage}` : 'Некорректный запрос'
    case AckErrorCode.Failed:
      return serverMessage ? `Ошибка сервера: ${serverMessage}` : 'Ошибка сервера'
    case ClientErrorCode.Timeout:
      return 'Сервер не ответил вовремя'
    case ClientErrorCode.Disconnected:
      return 'Нет соединения с сервером'
    default:
      return serverMessage || 'Неизвестная ошибка'
  }
}

// A failed socket request: an AckError from the server, a timeout or a missing connection.
// `message` is a Russian text ready to be shown to the user.
export class RequestError extends Error {
  public readonly code: RequestErrorCode
  public readonly serverMessage?: string

  constructor(code: RequestErrorCode, serverMessage?: string) {
    super(describe(code, serverMessage))
    Object.setPrototypeOf(this, new.target.prototype)
    this.name = 'RequestError'
    this.code = code
    this.serverMessage = serverMessage
  }

  static fromAck(ack: AckError): RequestError {
    return new RequestError(ack.error, ack.message)
  }
}

export const isRequestError = (error: unknown): error is RequestError => error instanceof RequestError

export const hasErrorCode = (error: unknown, code: RequestErrorCode): boolean => isRequestError(error) && error.code === code
