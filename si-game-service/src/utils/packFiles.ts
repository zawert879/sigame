import fs from 'fs/promises'
import path from 'path'
import { siqDir } from '../data'
import { isInsideDir } from './paths'

const MAX_FILE_NAME_LENGTH = 255

// A pack file is referenced by a plain file name inside siqDir: no directories, '.siq' extension.
export function isPackFileName(name: string): boolean {
  return name.length > 0
    && name.length <= MAX_FILE_NAME_LENGTH
    && name !== '.'
    && name !== '..'
    && !/[/\\]/.test(name)
    // eslint-disable-next-line no-control-regex
    && !/[\u0000-\u001F]/.test(name)
    && /^.+\.siq$/i.test(name)
    && isInsideDir(siqDir, path.resolve(siqDir, name))
}

// Final name of an uploaded file: the base name of the client file name, null when it is not a valid pack name
export function uploadFileName(originalFilename: string | null | undefined): string | null {
  const name = path.basename((originalFilename ?? '').replace(/\\/g, '/'))
  return isPackFileName(name) ? name : null
}

// Absolute path of an existing pack, null when there is no such pack in siqDir
export async function findPackFile(name: string): Promise<string | null> {
  if (!isPackFileName(name)) {
    return null
  }

  const files = await fs.readdir(siqDir)
  return files.includes(name) ? path.join(siqDir, name) : null
}
