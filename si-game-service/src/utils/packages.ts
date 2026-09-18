import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'
import { PACKAGES_DIR } from '../config'

// Extracted media of the packs. Every server process keeps them in a directory of its own:
//   <PACKAGES_DIR>/run-<pid>-<uuid>/<gameId>/<Images|Audio|Video>/...
// Only this directory is served (/api/files/<gameId>/...). A second copy of the server (on another PORT, or one that
// exits because the port is taken) never touches the media of a running copy, and nothing in PACKAGES_DIR is ever
// removed unless this app created it.

const UUID = '[\\da-f]{8}-[\\da-f]{4}-4[\\da-f]{3}-[89ab][\\da-f]{3}-[\\da-f]{12}'
// media directory of a server process
const RUN_DIR = new RegExp(`^run-(\\d+)-${UUID}$`)
// game directory of older versions, which kept the media of a game right in PACKAGES_DIR
const LEGACY_GAME_DIR = new RegExp(`^${UUID}$`)

// Windows: an antivirus or the indexer may still hold a freshly extracted file (EBUSY / EPERM / ENOTEMPTY)
export const RM_OPTIONS = { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }

// media directory of this process; it is created with the first extracted pack
export const mediaDir = path.join(PACKAGES_DIR, `run-${process.pid}-${randomUUID()}`)

export const gameMediaDir = (gameId: string): string => path.join(mediaDir, gameId)

const errorMessage = (error: unknown): unknown => error instanceof Error ? error.message : error

const isProcessAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    // EPERM: the process exists but belongs to another user
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

// a directory of packagesDir that a finished server process left behind
const isStale = (name: string): boolean => {
  if (LEGACY_GAME_DIR.test(name)) {
    return true
  }

  const run = RUN_DIR.exec(name)
  if (!run) {
    return false
  }

  const pid = Number(run[1])
  // a directory with the pid of this process (and another uuid) was left by an earlier process that had the same pid
  return pid === process.pid || !isProcessAlive(pid)
}

// Removes the media left by server processes that are gone: run directories of dead processes and game directories
// of older versions. Anything else in packagesDir — files, symlinks, other folders, the media of a running copy — is
// kept. app.ts calls it once the server listens, so a copy that fails to start removes nothing.
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

// Removes the media of a closed game. Never rejects: a directory that cannot be removed now is only logged — it stays
// in the media directory of this process and is removed at a later start.
export async function removeGameMedia(gameId: string): Promise<void> {
  const dir = gameMediaDir(gameId)
  try {
    await fs.promises.rm(dir, RM_OPTIONS)
  } catch (error) {
    console.warn(`Не удалось удалить медиа игры ${dir}:`, errorMessage(error))
  }
}
