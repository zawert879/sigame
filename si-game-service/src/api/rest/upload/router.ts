import Router from 'koa-router'
import c from './controller'

const router = new Router()
router.post('/', c.upload)

export default router.routes()
