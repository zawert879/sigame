const isBrowser = typeof window !== 'undefined'

const normalizeServerUrl = (value: string | undefined): string => {
  const trimmed = (value ?? '').trim().replace(/\/+$/, '')
  if (!trimmed) {
    return ''
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
}

export const serverUrl = normalizeServerUrl(process.env.NEXT_PUBLIC_SERVER_URL) || (isBrowser ? window.location.origin : '')

export const ADMIN_TOKEN_STORAGE_KEY = 'sigame.adminToken'

const readStoredToken = (): string | null => {
  try {
    return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || null
  } catch {
    return null
  }
}

const storeToken = (token: string | null) => {
  try {
    if (token) {
      window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token)
    } else {
      window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY)
    }
  } catch {
  }
}

const resolveAdminToken = (): string | null => {
  if (!isBrowser) {
    return null
  }
  const params = new URLSearchParams(window.location.search)
  if (params.has('token')) {
    const value = params.get('token') ?? ''
    const token = value.trim() === '' ? null : value
    storeToken(token)
    return token
  }
  return readStoredToken()
}

export const adminToken: string | null = resolveAdminToken()
