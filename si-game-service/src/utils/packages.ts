import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'
import { PACKAGES_DIR } from '../config'

const UUID = '[\\da-f]{8}-[\\da-f]{4}-4[\\da-f]{3}-[89ab][\\da-f]{3}-[\\da-f]{12}'
const RUN_DIR = new RegExp(`^run-(\\d+)-${UUID}$`)
const LEGACY_GAME_DIR = new RegExp(`^${UUID}$`)

export const RM_OPTIONS = { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }

export const mediaDir = path.join(PACKAGES_DIR, `run-${process.pid}-${randomUUID()}`)

export const gameMediaDir = (gameId: string): string => path.join(mediaDir, gameId)

const errorMessage = (error: unknown): unknown => error instanceof Error ? error.message : error

const isProcessAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

const isStale = (name: string): boolean => {
  if (LEGACY_GAME_DIR.test(name)) {
    return true
  }

  const run = RUN_DIR.exec(name)
  if (!run) {
    return false
  }

  const pid = Number(run[1])
  return pid === process.pid || !isProcessAlive(pid)
}

export function removeStaleMedia(packagesDir = PACKAGES_DIR, ownDir = mediaDir): void {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(packagesDir, { withFileTypes: true })
  } catch (error) {
    console.warn(`Не удалось прочитать ${packagesDir}:`, errorMessage(error))
    return
  }

  for (const entry of entries) {
    const dir = path.join(packagesDir, entry.name)
    if (!entry.isDirectory() || dir === ownDir || !isStale(entry.name)) {
      continue
    }

    try {
      fs.rmSync(dir, RM_OPTIONS)
    } catch (error) {
      console.warn(`Не удалось удалить медиа прошлого запуска ${dir}:`, errorMessage(error))
    }
  }
}

export async function removeGameMedia(gameId: string): Promise<void> {
  const dir = gameMediaDir(gameId)
  try {
    await fs.promises.rm(dir, RM_OPTIONS)
  } catch (error) {
    console.warn(`Не удалось удалить медиа игры ${dir}:`, errorMessage(error))
  }
}
