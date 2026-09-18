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

// Builds the app without listening: src/index.ts calls httpServer.listen(PORT), a test can listen(0).

// Whole request, i.e. a pack upload (up to 1 GB): 2 hours ≈ 1.2 Mbit/s. Node's default (5 minutes since Node 18)
// cut off a big pack sent over Wi-Fi with 408. A stalled connection is still closed by the idle timeout below.
const REQUEST_TIMEOUT = 2 * 60 * 60 * 1000
// socket idle time
const IDLE_TIMEOUT = 5 * 60 * 1000

for (const runtimeDir of [SIQ_DIR, PACKAGES_DIR]) {
  fs.mkdirSync(runtimeDir, { recursive: true })
}

const app = new Koa()
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

// media of the games of this process only (see utils/packages.ts)
app.use(mount('/api/files', serveFiles(mediaDir)))
app.use(mount('/files', serveFiles(mediaDir)))

if (fs.existsSync(FRONTEND_STATIC_DIR)) {
  app.use(serve(FRONTEND_STATIC_DIR))

  // SPA fallback: /admin/<id> → admin.html, /player/<id> → player.html, anything else → index.html
  app.use(async (ctx, next) => {
    await next()

    if (ctx.status !== 404 || ctx.method !== 'GET' || ctx.path.startsWith('/api') || ctx.path.startsWith('/socket.io')) {
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

// Media left by earlier runs are removed only once this server listens: a copy that exits because the port is taken
// must not touch anything
httpServer.once('listening', () => {
  removeStaleMedia()
})

const defaultGame = appState.newGame('Default')

httpServer.timeout = IDLE_TIMEOUT
httpServer.requestTimeout = REQUEST_TIMEOUT

export { app, io, httpServer, appState, defaultGame }
