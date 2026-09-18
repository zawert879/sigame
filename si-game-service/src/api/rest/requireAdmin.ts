import { type Context, type Next } from 'koa'
import { isAdminToken, isAdminTokenRequired } from '../../auth'

// Mutating REST endpoints: when ADMIN_TOKEN is set, require it in the 'x-admin-token' header or the 'token' query param
export const requireAdmin = async (ctx: Context, next: Next) => {
  if (isAdminTokenRequired()) {
    const header = ctx.get('x-admin-token')
    const query = ctx.query.token
    const token = header === '' ? (typeof query === 'string' ? query : undefined) : header
    if (!isAdminToken(token)) {
      ctx.status = 401
      ctx.body = { error: 'UNAUTHORIZED' }
      return
    }
  }

  await next()
}
