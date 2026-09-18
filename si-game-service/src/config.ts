import fs from 'fs'
import os from 'os'
import path from 'path'

// Runtime configuration of the server. Everything is read from the environment once, at import time,
// so a test can set the variables before importing src/app.ts.

const DEFAULT_PORT = 4000

const parsePort = (value: string | undefined): number => {
  if (value === undefined || value.trim() === '') {
    return DEFAULT_PORT
  }

  const port = Number(value)
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.warn(`Некорректный PORT="${value}", используется ${DEFAULT_PORT}`)
    return DEFAULT_PORT
  }

  return port
}

// a variable that is set and not blank
const envValue = (name: string): string | undefined => {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

const resolveDir = (value: string | undefined, fallback: string): string =>
  path.resolve(value && value.trim() !== '' ? value : fallback)

// Per-user data directory of the desktop app
const userDataDir = (): string => {
  const home = os.homedir()
  switch (process.platform) {
    case 'darwin': {
      return path.join(home, 'Library', 'Application Support', 'SIGame')
    }

    case 'win32': {
      return path.join(envValue('LOCALAPPDATA') ?? path.join(home, 'AppData', 'Local'), 'SIGame')
    }

    default: {
      return path.join(envValue('XDG_DATA_HOME') ?? path.join(home, '.local', 'share'), 'sigame')
    }
  }
}

// Directory that holds siq/ and packages/ unless SIQ_DIR / PACKAGES_DIR are set.
// - Sources (yarn dev / yarn start): the working directory.
// - Desktop build (@yao-pkg/pkg sets process.pkg): never the working directory — a macOS binary started from
//   Finder runs in $HOME. A siq/ folder next to the executable (a portable copy, or the packs of an older sigame.exe
//   that kept them in its working directory, i.e. its own folder) is used as is; otherwise the per-user data
//   directory: ~/Library/Application Support/SIGame, %LOCALAPPDATA%\SIGame, $XDG_DATA_HOME/sigame.
export const defaultDataDir = (isPackaged: boolean, executablePath: string): string => {
  if (!isPackaged) {
    return process.cwd()
  }

  const executableDir = path.dirname(executablePath)
  return fs.existsSync(path.join(executableDir, 'siq')) ? executableDir : userDataDir()
}

const dataDir = defaultDataDir('pkg' in process, process.execPath)

export const PORT = parsePort(process.env.PORT)

// Opt-in admin token (audit S5). null → every client may control the game (LAN mode, default).
// Surrounding whitespace is never part of the token ('set ADMIN_TOKEN=secret && sigame.exe' in cmd keeps a trailing
// space; the client trims ?token= and Node strips it from the x-admin-token header).
export const ADMIN_TOKEN: string | null = envValue('ADMIN_TOKEN') ?? null

// Uploaded .siq packs
export const SIQ_DIR = resolveDir(process.env.SIQ_DIR, path.join(dataDir, 'siq'))
// Extracted pack assets: <PACKAGES_DIR>/run-<pid>-<uuid>/<gameId>/<Images|Audio|Video>/... (see utils/packages.ts)
export const PACKAGES_DIR = resolveDir(process.env.PACKAGES_DIR, path.join(dataDir, 'packages'))
// Static export of the frontend (dist/public next to the compiled server)
export const FRONTEND_STATIC_DIR = resolveDir(process.env.FRONTEND_STATIC_DIR, path.join(__dirname, '..', '..', 'public'))
