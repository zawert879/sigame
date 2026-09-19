const CLIENT_ABORT_CODES = new Set(['EPIPE', 'ECONNRESET', 'ECONNABORTED', 'ERR_STREAM_PREMATURE_CLOSE', 'ERR_STREAM_DESTROYED'])

type HttpError = Error & { code?: unknown; status?: unknown; expose?: unknown }

export const isClientAbort = (error: HttpError): boolean =>
  (typeof error.code === 'string' && CLIENT_ABORT_CODES.has(error.code)) || error.message === 'aborted'

export const shouldLogHttpError = (error: HttpError): boolean =>
  !isClientAbort(error) && error.status !== 404 && error.expose !== true
