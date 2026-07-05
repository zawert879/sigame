/* eslint-disable @typescript-eslint/ban-ts-comment */
import Router from 'koa-router'
import c from './controller'

const router = new Router()
// @ts-expect-error
router.get('/', c.packs)
// @ts-expect-error
router.delete('/', c.removePack)

export default router.routes()
