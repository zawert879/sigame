import Koa from 'koa'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { packagesDir, siqDir, SystemEvent } from './data'
import { Controller } from './api/socket/Controller'
import { router } from './api/rest/router'
import koaBody from 'koa-body'
import { AppState } from './entity/AppState'
import { Socket } from './api/socket/Socket'
import { clearPackages } from './utils/clearPackages'
import cors from '@koa/cors'
import fs from 'fs'
import path from 'path'
import serve from 'koa-static'
import mount from 'koa-mount'

for (const runtimeDir of [siqDir, packagesDir]) {
  if (!fs.existsSync(runtimeDir)) {
    fs.mkdirSync(runtimeDir, { recursive: true })
  }
}

const app = new Koa()
const httpServer = createServer(app.callback())
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    credentials: true,
  },
})

const appState = new AppState()

app.use(koaBody({
  multipart: true,
  formidable: {
    maxFileSize: 1024 * 1024 * 1024,
  },
}))

app.use(async (ctx, next) => {
  ctx.appState = appState
  await next()
})

app.use(cors())
app.use(router.routes())

app.use(router.allowedMethods())

app.use(mount('/api/files', serve('./packages')))
app.use(mount('/files', serve('./packages')))

const frontendStaticDir = path.resolve(process.env.FRONTEND_STATIC_DIR ?? path.join(__dirname, '..', '..', 'public'))

if (fs.existsSync(frontendStaticDir)) {
  app.use(serve(frontendStaticDir))

  app.use(async (ctx, next) => {
    await next()

    if (ctx.status !== 404 || ctx.method !== 'GET' || ctx.path.startsWith('/api') || ctx.path.startsWith('/socket.io')) {
      return
    }

    const routeName = ctx.path.split('/').filter(Boolean)[0]
    const routeHtmlPath = routeName ? path.join(frontendStaticDir, `${routeName}.html`) : path.join(frontendStaticDir, 'index.html')
    const htmlPath = fs.existsSync(routeHtmlPath) ? routeHtmlPath : path.join(frontendStaticDir, 'index.html')

    if (!fs.existsSync(htmlPath)) {
      return
    }

    ctx.status = 200
    ctx.type = 'html'
    ctx.body = fs.createReadStream(htmlPath)
  })
}
io.on(SystemEvent.Connection, _socket => {
  let socket: Socket | undefined = new Socket(_socket)
  let controller: Controller | undefined = new Controller(socket, appState)

  socket.socketIo.on(SystemEvent.Handshake, controller.connect)

  socket.socketIo.on(SystemEvent.Disconnect, () => {
    controller?.disconnect()
    socket = undefined
    controller = undefined
  })
})

const defaultGame = appState.newGame('Default')

clearPackages()
httpServer.timeout = 300000
export { defaultGame, httpServer }
