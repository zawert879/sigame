import Router from 'koa-router'
import { healthInfo } from '../../appInfo'
import uploadRouter from './upload/router'
import packsRouter from './packs/router'

export const router = new Router({ prefix: '/api' })

router.get('/health', ctx => {
  ctx.set('Cache-Control', 'no-store')
  ctx.body = healthInfo()
})
router.use('/upload', uploadRouter)
router.use('/packs', packsRouter)
