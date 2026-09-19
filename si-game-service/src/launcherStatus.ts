import fs from 'fs/promises'
import { SIQ_DIR } from './config'
import type { LanCandidate } from './startupBanner'

export const READY_PREFIX = 'SIGAME_READY'
export const STATUS_PREFIX = 'SIGAME_STATUS'
export const FAILED_PREFIX = 'SIGAME_FAILED'

export const STATUS_INTERVAL = 300
export const PACKS_INTERVAL = 3000

const SIQ_FILE = /\.siq$/i

export type SocketRole = 'player' | 'admin'

export type Connections = Record<SocketRole, number>

export type LauncherStatusInfo = {
  connections: Connections;
  packsCount: number;
}

export type ReadyInfo = {
  version: string;
  port: number;
  addresses: LanCandidate[];
  gameId: string;
  adminToken: string | null;
  siqDir: string;
  packsCount: number;
}

export type RoleSocket = {
  handshake: { auth: unknown };
  once: (event: 'disconnect', listener: () => void) => unknown;
}

type Listener = () => void

const launcherLine = (prefix: string, payload: unknown): string => `${prefix} ${JSON.stringify(payload)}`

export const readyLine = (info: ReadyInfo): string => launcherLine(READY_PREFIX, {
  version: info.version,
  port: info.port,
  addresses: info.addresses.map(({ address, name, score }) => ({ address, name, score })),
  gameId: info.gameId,
  adminToken: info.adminToken,
  siqDir: info.siqDir,
  packsCount: info.packsCount,
})

export const statusLine = (status: LauncherStatusInfo): string => launcherLine(STATUS_PREFIX, {
  connections: { player: status.connections.player, admin: status.connections.admin },
  packsCount: status.packsCount,
})

export const failedLine = (message: string): string => launcherLine(FAILED_PREFIX, { message })

export const socketRole = (auth: unknown): SocketRole | null => {
  const role = typeof auth === 'object' && auth !== null ? (auth as Record<string, unknown>).role : undefined
  return role === 'player' || role === 'admin' ? role : null
}

export const countPacks = async (dir: string): Promise<number> => {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    return entries.filter(entry => !entry.isDirectory() && SIQ_FILE.test(entry.name)).length
  } catch {
    return 0
  }
}

export class LauncherStatus {
  private readonly _connections: Connections = { player: 0, admin: 0 }
  private _packsCount = 0
  private _packsRequest = 0
  private readonly _listeners = new Set<Listener>()

  constructor(private readonly _siqDir: string) {}

  public get packsCount(): number {
    return this._packsCount
  }

  public status(): LauncherStatusInfo {
    return { connections: { ...this._connections }, packsCount: this._packsCount }
  }

  public onChange(listener: Listener): () => void {
    this._listeners.add(listener)
    return () => {
      this._listeners.delete(listener)
    }
  }

  public addConnection(role: SocketRole | null): () => void {
    if (role === null) {
      return () => undefined
    }

    this._connections[role] += 1
    this._emit()
    let isReleased = false
    return () => {
      if (isReleased) {
        return
      }

      isReleased = true
      this._connections[role] -= 1
      this._emit()
    }
  }

  public trackSocket(socket: RoleSocket): void {
    const release = this.addConnection(socketRole(socket.handshake.auth))
    socket.once('disconnect', release)
  }

  public async refreshPacks(): Promise<number> {
    this._packsRequest += 1
    const request = this._packsRequest
    const count = await countPacks(this._siqDir)
    if (request === this._packsRequest && count !== this._packsCount) {
      this._packsCount = count
      this._emit()
    }

    return this._packsCount
  }

  public watchPacks(interval = PACKS_INTERVAL): () => void {
    const timer = setInterval(() => {
      void this.refreshPacks()
    }, interval)
    timer.unref()
    return () => {
      clearInterval(timer)
    }
  }

  private _emit() {
    for (const listener of [...this._listeners]) {
      listener()
    }
  }
}

export const reportStatus = (source: LauncherStatus, write: (line: string) => void, interval = STATUS_INTERVAL): () => void => {
  let lastLine: string | undefined
  let lastWrittenAt = 0
  let timer: NodeJS.Timeout | undefined

  const flush = () => {
    timer = undefined
    const line = statusLine(source.status())
    if (line !== lastLine) {
      lastLine = line
      lastWrittenAt = Date.now()
      write(line)
    }
  }

  const schedule = () => {
    if (timer) {
      return
    }

    const wait = lastWrittenAt + interval - Date.now()
    if (wait <= 0) {
      flush()
    } else {
      timer = setTimeout(flush, wait)
    }
  }

  flush()
  const unsubscribe = source.onChange(schedule)
  return () => {
    unsubscribe()
    clearTimeout(timer)
    timer = undefined
  }
}

export const launcherStatus = new LauncherStatus(SIQ_DIR)
