const isBrowser = typeof window !== 'undefined'

// NEXT_PUBLIC_SERVER_URL may be given without a protocol ("localhost:4000") — normalise it to an absolute URL.
const normalizeServerUrl = (value: string | undefined): string => {
  const trimmed = (value ?? '').trim().replace(/\/+$/, '')
  if (!trimmed) {
    return ''
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
}

// Base URL of si-game-service (socket.io + REST + media). In production the frontend is served by the service itself,
// so the page origin is used when NEXT_PUBLIC_SERVER_URL is not set.
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
    // storage may be unavailable (private mode, blocked site data) — the token then lives only in memory
  }
}

// Optional admin token (server env ADMIN_TOKEN). Read once on load from "?token=" of any page and remembered
// in localStorage; an empty (or blank) "?token=" forgets the stored token. The value is kept exactly as given, not
// trimmed: the server compares it byte for byte with ADMIN_TOKEN and puts ADMIN_TOKEN into its links as is.
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
