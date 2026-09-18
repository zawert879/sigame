import Router from 'koa-router'
import { requireAdmin } from '../requireAdmin'
import c from './controller'

const router = new Router()
router.post('/', requireAdmin, c.parseUpload, c.upload)

export default router.routes()
