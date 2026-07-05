import { type Context } from 'koa'
import fs from 'fs/promises'
import path from 'path'
import { siqDir } from '../../../data'

const upload = async (ctx: Context | any) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const fileRaw = ctx.request.files?.file
  if (!fileRaw) {
    ctx.body = null
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const file = Array.isArray(fileRaw) ? fileRaw[0] : fileRaw
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  await fs.copyFile(file.filepath, path.join(siqDir, file.originalFilename))

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  ctx.body = { file }
}

export default { upload }
