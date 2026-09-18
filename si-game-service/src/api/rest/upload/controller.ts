import { randomUUID } from 'crypto'
import fs from 'fs/promises'
import { type Context, type Next } from 'koa'
import koaBody from 'koa-body'
import path from 'path'
import { siqDir } from '../../../data'
import { uploadFileName } from '../../../utils/packFiles'
import { readSiqName } from '../../../utils/parseSIQ'
import { toArray } from '../../../utils/siqValue'
import { forgetPackName } from '../packs/controller'

const MAX_FILE_SIZE = 1024 * 1024 * 1024
const FILE_FIELD = 'file'

type UploadedFile = Extract<NonNullable<Context['request']['files']>[string], { filepath: string }>

const parseMultipart = koaBody({
  multipart: true,
  json: false,
  urlencoded: false,
  text: false,
  formidable: {
    maxFileSize: MAX_FILE_SIZE,
    filter: ({ name }) => name === FILE_FIELD,
  },
})

const uploadedFiles = (ctx: Context): UploadedFile[] =>
  Object.values(ctx.request.files ?? {}).flatMap(files => toArray<UploadedFile>(files))

const parseUpload = async (ctx: Context, next: Next) => {
  try {
    await parseMultipart(ctx, async () => undefined)
  } catch (error) {
    const { httpCode } = error as { httpCode?: number }
    console.warn('Ошибка загрузки пака:', error instanceof Error ? error.message : error)
    ctx.status = httpCode === 413 ? 413 : 400
    ctx.body = { error: httpCode === 413 ? 'FILE_TOO_LARGE' : 'INVALID_FILE' }
    return
  }

  await next()
}

async function moveFile(source: string, target: string) {
  try {
    await fs.rename(source, target)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EXDEV') {
      throw error
    }

    const partial = path.join(path.dirname(target), `.${randomUUID()}.part`)
    try {
      await fs.copyFile(source, partial)
      await fs.rename(partial, target)
    } finally {
      await fs.rm(partial, { force: true })
    }

    await fs.rm(source, { force: true })
  }
}

const upload = async (ctx: Context) => {
  const files: UploadedFile[] = toArray(ctx.request.files?.[FILE_FIELD])
  try {
    if (files.length === 0) {
      ctx.status = 400
      ctx.body = { error: 'INVALID_FILE' }
      return
    }

    const targets: Array<{ file: UploadedFile; name: string }> = []
    for (const file of files) {
      const name = uploadFileName(file.originalFilename)
      if (!name) {
        ctx.status = 400
        ctx.body = { error: 'INVALID_FILE' }
        return
      }

      targets.push({ file, name })
    }

    for (const { file, name } of targets) {
      try {
        readSiqName(file.filepath)
      } catch (error) {
        console.warn(`Загружен некорректный пак ${name}:`, error instanceof Error ? error.message : error)
        ctx.status = 400
        ctx.body = { error: 'INVALID_SIQ' }
        return
      }
    }

    for (const { file, name } of targets) {
      // eslint-disable-next-line no-await-in-loop
      await moveFile(file.filepath, path.join(siqDir, name))
      forgetPackName(name)
    }

    const names = targets.map(({ name }) => name)
    ctx.body = names.length === 1 ? { file: names[0] } : { file: names[0], files: names }
  } catch (error) {
    console.error('Не удалось сохранить пак:', error)
    ctx.status = 500
    ctx.body = { error: 'FAILED' }
  } finally {
    await Promise.all(uploadedFiles(ctx).map(async file => fs.rm(file.filepath, { force: true }).catch(() => undefined)))
  }
}

export default { parseUpload, upload }
