import Koa from 'koa'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from '@koa/cors'
import fs from 'fs'
import path from 'path'
import serve from 'koa-static'
import mount from 'koa-mount'
import { SystemEvent } from './data'
import { FRONTEND_STATIC_DIR, PACKAGES_DIR, SIQ_DIR } from './config'
import { isAdminToken } from './auth'
import { serveFiles } from './api/files'
import { Controller } from './api/socket/Controller'
import { Socket } from './api/socket/Socket'
import { router } from './api/rest/router'
import { AppState } from './entity/AppState'
import { mediaDir, removeStaleMedia } from './utils/packages'
import { isPageRequest } from './utils/pageRoutes'
import { shouldLogHttpError } from './utils/httpErrors'

const REQUEST_TIMEOUT = 2 * 60 * 60 * 1000
const IDLE_TIMEOUT = 5 * 60 * 1000

for (const runtimeDir of [SIQ_DIR, PACKAGES_DIR]) {
  fs.mkdirSync(runtimeDir, { recursive: true })
}

const app = new Koa()
app.on('error', (error: Error, ctx?: Koa.Context) => {
  if (shouldLogHttpError(error)) {
    const where = ctx ? ` ${ctx.method} ${ctx.path}` : ''
    console.error(`Ошибка HTTP${where}:`, error)
  }
})
const httpServer = createServer(app.callback())
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
})

const appState = new AppState()

app.use(cors())
app.use(router.routes())
app.use(router.allowedMethods())

app.use(mount('/api/files', serveFiles(mediaDir)))
app.use(mount('/files', serveFiles(mediaDir)))

if (fs.existsSync(FRONTEND_STATIC_DIR)) {
  app.use(serve(FRONTEND_STATIC_DIR))

  app.use(async (ctx, next) => {
    await next()

    if (ctx.status !== 404 || ctx.method !== 'GET' || !isPageRequest(ctx.path)) {
      return
    }

    const routeName = ctx.path.split('/').find(Boolean)
    const routeHtmlPath = routeName && /^[\w-]+$/.test(routeName) ? path.join(FRONTEND_STATIC_DIR, `${routeName}.html`) : null
    const htmlPath = routeHtmlPath && fs.existsSync(routeHtmlPath) ? routeHtmlPath : path.join(FRONTEND_STATIC_DIR, 'index.html')

    if (!fs.existsSync(htmlPath)) {
      return
    }

    ctx.status = 200
    ctx.type = 'html'
    ctx.body = fs.createReadStream(htmlPath)
  })
}

io.on(SystemEvent.Connection, socketIo => {
  const socket = new Socket(socketIo)
  // eslint-disable-next-line no-new
  new Controller(socket, appState, isAdminToken(socket.authToken))
})

httpServer.once('listening', () => {
  removeStaleMedia()
})

const defaultGame = appState.newGame('Default')

httpServer.timeout = IDLE_TIMEOUT
httpServer.requestTimeout = REQUEST_TIMEOUT

export { app, io, httpServer, appState, defaultGame }
