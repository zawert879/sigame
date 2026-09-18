import fs from 'fs'
import type { AddressInfo } from 'net'
import os from 'os'
import path from 'path'
import { io, type Socket } from 'socket.io-client'
import type * as appModule from '../../src/app'
import type * as configModule from '../../src/config'
import type { AckError, PackInfo } from '../../src/types'
import { makeTempDir } from './fixtures'

type AppModule = typeof appModule
type ConfigModule = typeof configModule

export type AppDirs = {
  siqDir: string;
  packagesDir: string;
  uploadTmpDir: string;
}

export type LoadedApp = AppDirs & {
  app: AppModule;
  config: ConfigModule;
}

export type TestServer = LoadedApp & {
  base: string;
  close: () => Promise<void>;
}

export type StartOptions = {
  env?: Record<string, string>;
  prepare?: (dirs: AppDirs) => void;
  dirs?: AppDirs;
}

const ACK_TIMEOUT = 3000
const WAIT_TIMEOUT = 3000

function newDirs(): AppDirs {
  const root = makeTempDir('server-')
  const dirs = {
    siqDir: path.join(root, 'siq'),
    packagesDir: path.join(root, 'packages'),
    uploadTmpDir: path.join(root, 'upload-tmp'),
  }
  for (const dir of Object.values(dirs)) {
    fs.mkdirSync(dir)
  }

  return dirs
}

export function loadApp(options: StartOptions = {}): LoadedApp {
  const dirs = options.dirs ?? newDirs()
  const { siqDir, packagesDir, uploadTmpDir } = dirs
  options.prepare?.(dirs)

  const variables: Record<string, string> = { SIQ_DIR: siqDir, PACKAGES_DIR: packagesDir, ...options.env }
  const saved = new Map(Object.keys(variables).map(key => [key, process.env[key]]))
  Object.assign(process.env, variables)
  const tmpdir = jest.spyOn(os, 'tmpdir').mockReturnValue(uploadTmpDir)
  let modules: { app: AppModule; config: ConfigModule } | undefined
  try {
    jest.isolateModules(() => {
      /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
      modules = {
        config: require('../../src/config') as ConfigModule,
        app: require('../../src/app') as AppModule,
      }
      /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
    })
  } finally {
    tmpdir.mockRestore()
    for (const [key, value] of saved) {
      if (value === undefined) {
        Reflect.deleteProperty(process.env, key)
      } else {
        process.env[key] = value
      }
    }
  }

  if (!modules) {
    throw new Error('the application was not loaded')
  }

  return { ...modules, ...dirs }
}

export async function startServer(options: StartOptions = {}): Promise<TestServer> {
  const loaded = loadApp(options)
  const { app } = loaded
  await new Promise<void>(resolve => {
    app.httpServer.listen(0, '127.0.0.1', resolve)
  })
  const { port } = app.httpServer.address() as AddressInfo

  return {
    ...loaded,
    base: `http://127.0.0.1:${port}`,
    async close() {
      await new Promise<void>(resolve => {
        app.io.close(() => {
          resolve()
        })
        app.httpServer.closeAllConnections()
      })
    },
  }
}

export type Received = {
  event: string;
  payload: unknown;
}

export class TestClient {
  readonly socket: Socket
  readonly received: Received[] = []
  private readonly _onReceive = new Set<() => void>()

  constructor(base: string, auth?: Record<string, unknown>) {
    this.socket = io(base, { transports: ['websocket'], reconnection: false, forceNew: true, auth })
    this.socket.onAny((event: string, payload: unknown) => {
      this.received.push({ event, payload })
      for (const listener of [...this._onReceive]) {
        listener()
      }
    })
  }

  async connected(): Promise<this> {
    if (!this.socket.connected) {
      await new Promise<void>((resolve, reject) => {
        this.socket.once('connect', resolve)
        this.socket.once('connect_error', reject)
      })
    }

    return this
  }

  async request<T = unknown>(event: string, payload?: unknown): Promise<T> {
    const socket = this.socket.timeout(ACK_TIMEOUT)
    const response: unknown = payload === undefined ? await socket.emitWithAck(event) : await socket.emitWithAck(event, payload)
    return response as T
  }

  async ackError(event: string, payload?: unknown): Promise<AckError> {
    const response = await this.request(event, payload)
    if (!isAckError(response)) {
      throw new Error(`${event}: an AckError was expected, got ${JSON.stringify(response)}`)
    }

    return response
  }

  async sync(): Promise<void> {
    await this.request('getGames')
  }

  mark(): number {
    return this.received.length
  }

  since(mark: number, event?: string): Received[] {
    return this.received.slice(mark).filter(item => event === undefined || item.event === event)
  }

  payloads<T>(mark: number, event: string): T[] {
    return this.since(mark, event).map(item => item.payload as T)
  }

  async waitFor<T = unknown>(event: string, options: { from?: number; match?: (payload: T) => boolean; timeout?: number } = {}): Promise<T> {
    const { from = 0, match, timeout = WAIT_TIMEOUT } = options
    const find = () => this.received.slice(from).find(item => item.event === event && (!match || match(item.payload as T)))
    const found = find()
    if (found) {
      return found.payload as T
    }

    return new Promise<T>((resolve, reject) => {
      const onReceive = () => {
        const item = find()
        if (item) {
          clearTimeout(timer)
          this._onReceive.delete(onReceive)
          resolve(item.payload as T)
        }
      }

      const timer = setTimeout(() => {
        this._onReceive.delete(onReceive)
        reject(new Error(`no ${event} within ${timeout} ms, received: ${this.received.slice(from).map(item => item.event).join(', ')}`))
      }, timeout)
      this._onReceive.add(onReceive)
    })
  }

  close() {
    this.socket.disconnect()
  }
}

export function isAckError(value: unknown): value is AckError {
  return typeof value === 'object' && value !== null && 'error' in value && typeof (value as AckError).error === 'string'
}

export async function waitUntil(condition: () => boolean, description: string, timeout = WAIT_TIMEOUT): Promise<void> {
  const started = Date.now()
  while (!condition()) {
    if (Date.now() - started > timeout) {
      throw new Error(`timeout: ${description}`)
    }

    // eslint-disable-next-line no-await-in-loop
    await new Promise(resolve => {
      setTimeout(resolve, 5)
    })
  }
}

export type UploadFile = {
  name: string;
  content: Buffer | string;
  field?: string;
}

export type JsonResponse = {
  status: number;
  body: unknown;
}

export async function upload(base: string, files: UploadFile[], init: { headers?: Record<string, string>; query?: string } = {}): Promise<JsonResponse> {
  const form = new FormData()
  for (const file of files) {
    form.append(file.field ?? 'file', new Blob([file.content]), file.name)
  }

  const response = await fetch(`${base}/api/upload${init.query ?? ''}`, { method: 'POST', body: form, headers: init.headers })
  return { status: response.status, body: await response.json().catch(() => null) as unknown }
}

export async function listPacks(base: string): Promise<PackInfo[]> {
  const response = await fetch(`${base}/api/packs`)
  if (response.status !== 200) {
    throw new Error(`GET /api/packs: ${response.status}`)
  }

  return await response.json() as PackInfo[]
}

export async function deletePack(base: string, query: string, headers?: Record<string, string>): Promise<JsonResponse> {
  const response = await fetch(`${base}/api/packs${query}`, { method: 'DELETE', headers })
  return { status: response.status, body: await response.json().catch(() => null) as unknown }
}
