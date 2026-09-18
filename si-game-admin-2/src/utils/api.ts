import { adminToken, serverUrl } from '@/config'

const ABSOLUTE_URL = /^https?:\/\//i

// Absolute URL of a si-game-service endpoint ("/api/packs" → "http://host:4000/api/packs").
export const apiUrl = (path: string): string => `${serverUrl}${path.startsWith('/') ? path : `/${path}`}`

// URL of a REST endpoint that requires the admin token (upload / delete packs). The token goes in the percent-encoded
// "token" query parameter rather than the 'x-admin-token' header: header values must be ByteStrings, so fetch/XHR
// throw before sending a token with characters above U+00FF (e.g. Cyrillic).
export const adminApiUrl = (path: string): string => {
  const url = apiUrl(path)
  if (!adminToken) {
    return url
  }
  return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(adminToken)}`
}

export type MediaKind = 'Images' | 'Audio' | 'Video'

export const isAbsoluteUrl = (value: string): boolean => ABSOLUTE_URL.test(value)

// URL of a pack asset extracted by the server into packages/<gameId>/<kind>/<name>. Absolute http(s) links are kept.
export const mediaUrl = (gameId: string | null | undefined, kind: MediaKind, name: string): string => {
  if (isAbsoluteUrl(name)) {
    return name
  }
  return apiUrl(`/api/files/${encodeURIComponent(gameId ?? '')}/${kind}/${encodeURIComponent(name)}`)
}

// Error thrown by REST helpers; `status` is the HTTP status (0 for network errors).
export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'HttpError'
  }
}

export const httpErrorMessage = (status: number): string => {
  if (status === 401) {
    return 'Нет доступа: откройте ссылку ведущего с токеном (?token=…)'
  }
  if (status === 0) {
    return 'Нет соединения с сервером'
  }
  return `Ошибка сервера (${status})`
}

// `admin`: the endpoint requires the admin token (see adminApiUrl).
export const apiFetch = async (path: string, init: RequestInit = {}, { admin = false }: { admin?: boolean } = {}): Promise<Response> => {
  let response: Response
  try {
    response = await fetch(admin ? adminApiUrl(path) : apiUrl(path), init)
  } catch {
    throw new HttpError(0, httpErrorMessage(0))
  }
  if (!response.ok) {
    throw new HttpError(response.status, httpErrorMessage(response.status))
  }
  return response
}
