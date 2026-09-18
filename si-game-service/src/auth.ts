import crypto from 'crypto'
import { ADMIN_TOKEN } from './config'

export const isAdminTokenRequired = (): boolean => ADMIN_TOKEN !== null

export const isAdminToken = (token: unknown): boolean => {
  if (ADMIN_TOKEN === null) {
    return true
  }

  if (typeof token !== 'string') {
    return false
  }

  const expected = Buffer.from(ADMIN_TOKEN)
  const actual = Buffer.from(token.trim())
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}
