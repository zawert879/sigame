import Router from 'koa-router'
import uploadRouter from './upload/router'
import packsRouter from './packs/router'

export const router = new Router({ prefix: '/api' })

router.use('/upload', uploadRouter)
router.use('/packs', packsRouter)
router.get('/fatal', async (ctx) => {
  process.exit(1)
})
