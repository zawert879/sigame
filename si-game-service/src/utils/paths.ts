import path from 'path'

export function isInsideDir(dir: string, target: string): boolean {
  const relative = path.relative(path.resolve(dir), path.resolve(target))
  return relative !== ''
    && relative !== '..'
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative)
}

export function safeDecodeUriComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
