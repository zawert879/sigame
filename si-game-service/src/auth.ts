import crypto from 'crypto'
import { ADMIN_TOKEN } from './config'

export const isAdminTokenRequired = (): boolean => ADMIN_TOKEN !== null

// true when admin actions are allowed with the given token: always when ADMIN_TOKEN is not configured.
export const isAdminToken = (token: unknown): boolean => {
  if (ADMIN_TOKEN === null) {
    return true
  }

  if (typeof token !== 'string') {
    return false
  }

  // whitespace around a token is never significant (ADMIN_TOKEN is trimmed too, see config.ts)
  const expected = Buffer.from(ADMIN_TOKEN)
  const actual = Buffer.from(token.trim())
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}
