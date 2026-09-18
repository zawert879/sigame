export type OneOrMany<T> = T | T[]

export function toArray<T>(value: OneOrMany<T> | null | undefined): T[] {
  if (value === undefined || value === null || (value as unknown) === '') {
    return []
  }

  return Array.isArray(value) ? value : [value]
}

export function textOf(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    const parts = textList(value)
    return parts.length > 0 ? parts.join(', ') : null
  }

  if (typeof value === 'object' && '#text' in value) {
    return textOf((value as { '#text': unknown })['#text'])
  }

  return null
}

export function textList(value: unknown): string[] {
  const result: string[] = []
  for (const item of toArray(value)) {
    const text = textOf(item)
    if (text !== null) {
      result.push(text)
    }
  }

  return result
}

export function numberOf(value: unknown): number | null {
  const text = textOf(value)
  if (text === null || text.trim() === '') {
    return null
  }

  const result = Number(text)
  return Number.isFinite(result) ? result : null
}
