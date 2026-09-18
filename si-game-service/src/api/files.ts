import fs from 'fs'
import { type Context, type Middleware } from 'koa'
import serve from 'koa-static'

export type ByteRange = {
  start: number;
  end: number;
}

export function parseByteRange(header: string, size: number): ByteRange | 'unsatisfiable' | null {
  const match = /^\s*bytes\s*=\s*(\d*)\s*-\s*(\d*)\s*$/i.exec(header)
  if (!match || (match[1] === '' && match[2] === '')) {
    return null
  }

  const [, first, last] = match
  if (first === '') {
    const length = Number(last)
    return length === 0 || size === 0 ? 'unsatisfiable' : { start: Math.max(size - length, 0), end: size - 1 }
  }

  const start = Number(first)
  if (last !== '' && Number(last) < start) {
    return null
  }

  if (start >= size) {
    return 'unsatisfiable'
  }

  return { start, end: last === '' ? size - 1 : Math.min(Number(last), size - 1) }
}

const isIfRangeFresh = (ctx: Context): boolean => {
  const ifRange = ctx.get('If-Range')
  return ifRange === '' || ifRange === ctx.response.get('Last-Modified')
}

function applyByteRange(ctx: Context) {
  const { body } = ctx
  if (ctx.status !== 200 || !(body instanceof fs.ReadStream)) {
    return
  }

  ctx.set('Accept-Ranges', 'bytes')
  const header = ctx.get('Range')
  const size = ctx.length
  if (header === '' || size === undefined || !isIfRangeFresh(ctx)) {
    return
  }

  const range = parseByteRange(header, size)
  if (range === null) {
    return
  }

  body.destroy()
  if (range === 'unsatisfiable') {
    ctx.status = 416
    ctx.set('Content-Range', `bytes */${size}`)
    ctx.type = 'text/plain'
    ctx.body = 'Range Not Satisfiable'
    return
  }

  ctx.status = 206
  ctx.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`)
  ctx.body = fs.createReadStream(body.path, { start: range.start, end: range.end })
  ctx.length = range.end - range.start + 1
}

export const PACK_FILE_CSP = 'sandbox allow-scripts allow-forms allow-popups allow-modals'

export function serveFiles(root: string): Middleware {
  const serveStatic = serve(root)
  return async (ctx, next) => {
    let isNotServed = false
    await serveStatic(ctx, async () => {
      isNotServed = true
      await next()
    })

    if (!isNotServed) {
      ctx.set('Content-Security-Policy', PACK_FILE_CSP)
      applyByteRange(ctx)
    }
  }
}
