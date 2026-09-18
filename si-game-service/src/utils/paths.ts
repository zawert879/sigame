import path from 'path'

// true when `target` is strictly inside `dir` (both are resolved first)
export function isInsideDir(dir: string, target: string): boolean {
  const relative = path.relative(path.resolve(dir), path.resolve(target))
  return relative !== ''
    && relative !== '..'
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative)
}

// decodeURIComponent that never throws (a lone '%' in a zip entry name is a URIError)
export function safeDecodeUriComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
