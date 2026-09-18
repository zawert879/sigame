import Router from 'koa-router'
import { requireAdmin } from '../requireAdmin'
import c from './controller'

const router = new Router()
router.get('/', c.packs)
router.delete('/', requireAdmin, c.removePack)

export default router.routes()
