import fs from 'fs/promises'
import { type Context } from 'koa'
import path from 'path'
import { siqDir } from '../../../data'
import type { PackInfo, ResponseGetPacks } from '../../../types'
import { findPackFile } from '../../../utils/packFiles'
import { readSiqName } from '../../../utils/parseSIQ'

type CachedPack = {
  mtimeMs: number;
  size: number;
  pack: PackInfo;
}

const packCache = new Map<string, CachedPack>()

export function forgetPackName(file: string) {
  packCache.delete(file)
}

async function packInfo(file: string): Promise<PackInfo> {
  const filePath = path.join(siqDir, file)
  const stat = await fs.stat(filePath)
  const cached = packCache.get(file)
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
    return cached.pack
  }

  let pack: PackInfo
  try {
    const name = readSiqName(filePath)
    pack = { name: name.trim() === '' ? path.parse(file).name : name, file, isBroken: false }
  } catch (error) {
    console.warn(`Не удалось прочитать пак ${file}:`, error instanceof Error ? error.message : error)
    pack = { name: '', file, isBroken: true }
  }

  packCache.set(file, { mtimeMs: stat.mtimeMs, size: stat.size, pack })
  return pack
}

const packs = async (ctx: Context) => {
  const files = (await fs.readdir(siqDir)).filter(file => /\.siq$/i.test(file))
  const result: ResponseGetPacks = []
  for (const file of files) {
    try {
      // eslint-disable-next-line no-await-in-loop
      result.push(await packInfo(file))
    } catch (error) {
      console.warn(`Не удалось прочитать пак ${file}:`, error instanceof Error ? error.message : error)
    }
  }

  for (const file of packCache.keys()) {
    if (!files.includes(file)) {
      packCache.delete(file)
    }
  }

  ctx.body = result
}

const removePack = async (ctx: Context) => {
  const { file } = ctx.query
  const filePath = typeof file === 'string' ? await findPackFile(file) : null
  if (!filePath || typeof file !== 'string') {
    ctx.status = 404
    ctx.body = { error: 'File not found' }
    return
  }

  try {
    await fs.rm(filePath)
    forgetPackName(file)
    ctx.body = { message: 'ok' }
  } catch (error) {
    console.warn(`Не удалось удалить пак ${file}:`, error instanceof Error ? error.message : error)
    ctx.status = 404
    ctx.body = { error: 'File not found' }
  }
}

export default { packs, removePack }
