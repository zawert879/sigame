import { adminToken, serverUrl } from '@/config'

const ABSOLUTE_URL = /^https?:\/\//i

export const apiUrl = (path: string): string => `${serverUrl}${path.startsWith('/') ? path : `/${path}`}`

export const adminApiUrl = (path: string): string => {
  const url = apiUrl(path)
  if (!adminToken) {
    return url
  }
  return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(adminToken)}`
}

export type MediaKind = 'Images' | 'Audio' | 'Video' | 'Html'

export const isAbsoluteUrl = (value: string): boolean => ABSOLUTE_URL.test(value)

export const mediaUrl = (gameId: string | null | undefined, kind: MediaKind, name: string): string => {
  if (isAbsoluteUrl(name)) {
    return name
  }
  return apiUrl(`/api/files/${encodeURIComponent(gameId ?? '')}/${kind}/${encodeURIComponent(name)}`)
}

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
