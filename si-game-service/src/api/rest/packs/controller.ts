import fs from 'fs/promises'
import path from 'path'
import { siqDir } from '../../../data'
import { type MyContext } from '../../../serverTypes'
import { parseSIQName } from '../../../utils/parseSIQ'

const packs = async (ctx: MyContext) => {
  const files = await fs.readdir(siqDir)
  ctx.body = files.map((file: string) => ({
    name: parseSIQName(`./siq/${file}`),
    file,
  }))
}

const removePack = async (ctx: MyContext) => {
  const { file } = ctx.query
  if (!file || Array.isArray(file)) {
    ctx.status = 404
    ctx.body = {
      error: 'File not found',
    }
    return
  }

  const files = await fs.readdir(siqDir)

  try {
    if (files.includes(file)) {
      await fs.rm((path.join(siqDir, file)))
      ctx.body = {
        message: 'ok',
      }
      return
    }
  } catch (error) {
    ctx.status = 404
    ctx.body = {
      error: 'File not found',
    }
  }

  ctx.status = 404
  ctx.body = {
    error: 'File not found',
  }
}

export default { packs, removePack }
