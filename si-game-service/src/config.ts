import fs from 'fs'
import os from 'os'
import path from 'path'

export const DEFAULT_PORT = 4000

const parsePort = (value: string | undefined): number | null => {
  if (value === undefined || value.trim() === '') {
    return null
  }

  const port = Number(value)
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.warn(`Некорректный PORT="${value}", используется ${DEFAULT_PORT}`)
    return null
  }

  return port
}

const envValue = (name: string): string | undefined => {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

const resolveDir = (value: string | undefined, fallback: string): string =>
  path.resolve(value && value.trim() !== '' ? value : fallback)

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

export const defaultDataDir = (isPackaged: boolean, executablePath: string): string => {
  if (!isPackaged) {
    return process.cwd()
  }

  const executableDir = path.dirname(executablePath)
  return fs.existsSync(path.join(executableDir, 'siq')) ? executableDir : userDataDir()
}

const dataDir = defaultDataDir('pkg' in process, process.execPath)

const envPort = parsePort(process.env.PORT)

export const PORT = envPort ?? DEFAULT_PORT

export const isPortExplicit = envPort !== null

export const ADMIN_TOKEN: string | null = envValue('ADMIN_TOKEN') ?? null

export const SIQ_DIR = resolveDir(process.env.SIQ_DIR, path.join(dataDir, 'siq'))
export const PACKAGES_DIR = resolveDir(process.env.PACKAGES_DIR, path.join(dataDir, 'packages'))
export const FRONTEND_STATIC_DIR = resolveDir(process.env.FRONTEND_STATIC_DIR, path.join(__dirname, '..', '..', 'public'))
