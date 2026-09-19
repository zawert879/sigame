import { spawn } from 'child_process'
import EventEmitter from 'eventemitter3'
import fs from 'fs'
import http, { type Server } from 'http'
import net, { type AddressInfo } from 'net'
import path from 'path'
import {
  FALLBACK_PORTS,
  isAcceptingConnections,
  isPortBusy,
  listenFailureMessage,
  listenOn,
  listenSafely,
  type ListenResult,
  readHealth,
} from '../src/portGuard'
import { makeTempDir } from './helpers/fixtures'
import { startServer, type TestServer } from './helpers/server'

const HOST = '127.0.0.1'
const SERVICE_ROOT = path.join(__dirname, '..')

type Closable = { close: (callback: () => void) => unknown }

const opened: Closable[] = []

const listen = async <T extends net.Server>(server: T, port = 0): Promise<T> => {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, HOST, () => {
      resolve()
    })
  })
  opened.push(server)
  return server
}

const portOf = (server: net.Server): number => (server.address() as AddressInfo).port

const close = async (server: Closable) => new Promise<void>(resolve => {
  server.close(() => {
    resolve()
  })
  if (server instanceof http.Server) {
    server.closeAllConnections()
  }
})

const freePort = async (): Promise<number> => {
  const server = net.createServer()
  await new Promise<void>(resolve => {
    server.listen(0, HOST, resolve)
  })
  const port = portOf(server)
  await close(server)
  return port
}

const otherApp = async (body = 'hello', type = 'text/plain'): Promise<Server> => listen(http.createServer((_, response) => {
  response.setHeader('content-type', type)
  response.end(body)
}))

const rawTcp = async (): Promise<net.Server> => listen(net.createServer(socket => {
  socket.on('error', () => undefined)
  socket.end('SSH-2.0-not-http\r\n', () => {
    socket.destroy()
  })
}))

class FakeServer extends EventEmitter {
  readonly attempts: number[] = []
  private _port = 0

  constructor(private readonly errors: Record<number, string>) {
    super()
  }

  listen(port: number) {
    this.attempts.push(port)
    setImmediate(() => {
      const code = this.errors[port]
      if (code) {
        this.emit('error', Object.assign(new Error(`listen ${code}: ${port}`), { code }))
        return
      }

      this._port = port === 0 ? 50_000 : port
      this.emit('listening')
    })
    return this
  }

  address() {
    return { port: this._port, address: HOST, family: 'IPv4' }
  }
}

const fake = (errors: Record<number, string>) => {
  const server = new FakeServer(errors)
  return { server, target: server as unknown as Server }
}

afterEach(async () => {
  await Promise.all(opened.splice(0).map(async server => close(server)))
})

describe('probing a port', () => {
  test('isAcceptingConnections / isPortBusy: true while something listens, false after it closes', async () => {
    const server = await otherApp()
    const port = portOf(server)
    expect(await isAcceptingConnections(port, HOST)).toBe(true)
    expect(await isPortBusy(port)).toBe(true)

    await close(opened.pop()!)
    expect(await isAcceptingConnections(port, HOST)).toBe(false)
    expect(await isPortBusy(port)).toBe(false)
  })

  test('readHealth: only an SI Game server answers with its health', async () => {
    const sigame: TestServer = await startServer()
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(SERVICE_ROOT, 'package.json'), 'utf8')) as { version: string }
      const { port } = new URL(sigame.base)
      expect(await readHealth(Number(port))).toEqual({ app: 'sigame', version: packageJson.version })
    } finally {
      await sigame.close()
    }

    expect(await readHealth(portOf(await otherApp()))).toBeNull()
    expect(await readHealth(portOf(await otherApp('{"app":"other","version":"1"}', 'application/json')))).toBeNull()
    expect(await readHealth(portOf(await otherApp('{"app":"sigame"}', 'application/json')))).toBeNull()
    expect(await readHealth(portOf(await otherApp('not json', 'application/json')))).toBeNull()
    expect(await readHealth(portOf(await rawTcp()))).toBeNull()
    expect(await readHealth(await freePort())).toBeNull()
  })

  test('readHealth gives up on a server that never answers', async () => {
    const silent = await listen(http.createServer(() => undefined))
    const started = Date.now()
    expect(await readHealth(portOf(silent), 200)).toBeNull()
    expect(Date.now() - started).toBeLessThan(2000)
  })
})

describe('listenSafely', () => {
  test('the fallback ports are 4001..4010', () => {
    expect(FALLBACK_PORTS).toEqual([4001, 4002, 4003, 4004, 4005, 4006, 4007, 4008, 4009, 4010])
  })

  test.each([false, true])('a free port is used as it is (explicit: %s)', async isExplicit => {
    const port = await freePort()
    const target = http.createServer()
    expect(await listenSafely(target, { port, isExplicit, host: HOST, fallbackPorts: [] })).toEqual({ status: 'listening', port })
    opened.push(target)
    expect(portOf(target)).toBe(port)
  })

  test('implicit port with SI Game on it: "running", nothing listens', async () => {
    const sigame = await startServer()
    try {
      const port = Number(new URL(sigame.base).port)
      const target = http.createServer()
      expect(await listenSafely(target, { port, isExplicit: false, host: HOST, fallbackPorts: [await freePort()] })).toEqual({ status: 'running', port })
      expect(target.listening).toBe(false)
    } finally {
      await sigame.close()
    }
  })

  test('implicit port taken by another program: the first free fallback port', async () => {
    const busy = portOf(await otherApp())
    const alsoBusy = portOf(await rawTcp())
    const free = await freePort()
    const target = http.createServer()
    expect(await listenSafely(target, { port: busy, isExplicit: false, host: HOST, fallbackPorts: [alsoBusy, busy, free] })).toEqual({ status: 'listening', port: free })
    opened.push(target)
    expect(portOf(target)).toBe(free)
  })

  test('SI Game on a fallback port: "running" there', async () => {
    const sigame = await startServer()
    try {
      const busy = portOf(await otherApp())
      const port = Number(new URL(sigame.base).port)
      const target = http.createServer()
      expect(await listenSafely(target, { port: busy, isExplicit: false, host: HOST, fallbackPorts: [port, await freePort()] })).toEqual({ status: 'running', port })
      expect(target.listening).toBe(false)
    } finally {
      await sigame.close()
    }
  })

  test('treatRunningAsBusy: SI Game on the implicit port is skipped like any busy port', async () => {
    const sigame = await startServer()
    try {
      const port = Number(new URL(sigame.base).port)
      const busy = portOf(await otherApp())
      const free = await freePort()
      const target = http.createServer()
      expect(await listenSafely(target, { port, isExplicit: false, host: HOST, fallbackPorts: [busy, port, free], treatRunningAsBusy: true }))
        .toEqual({ status: 'listening', port: free })
      opened.push(target)
      expect(portOf(target)).toBe(free)
    } finally {
      await sigame.close()
    }
  })

  test('treatRunningAsBusy: SI Game on every candidate port gives an ephemeral port', async () => {
    const first = await startServer()
    const second = await startServer()
    try {
      const ports = [first, second].map(server => Number(new URL(server.base).port))
      const target = http.createServer()
      const result = await listenSafely(target, { port: ports[0], isExplicit: false, host: HOST, fallbackPorts: [ports[1]], treatRunningAsBusy: true })
      opened.push(target)
      expect(result).toEqual({ status: 'listening', port: portOf(target) })
      expect(ports).not.toContain(result.port)
    } finally {
      await first.close()
      await second.close()
    }
  })

  test('treatRunningAsBusy does not change an explicit port: SI Game there is still a failure', async () => {
    const sigame = await startServer()
    try {
      const port = Number(new URL(sigame.base).port)
      const target = http.createServer()
      expect(await listenSafely(target, { port, isExplicit: true, host: HOST, fallbackPorts: [await freePort()], treatRunningAsBusy: true }))
        .toEqual({ status: 'failed', port, reason: 'sigame' })
      expect(target.listening).toBe(false)
    } finally {
      await sigame.close()
    }
  })

  test('every fallback port taken: an ephemeral port', async () => {
    const busy = portOf(await otherApp())
    const alsoBusy = portOf(await otherApp())
    const target = http.createServer()
    const result = await listenSafely(target, { port: busy, isExplicit: false, host: HOST, fallbackPorts: [alsoBusy] })
    opened.push(target)
    expect(result.status).toBe('listening')
    expect(result.port).toBe(portOf(target))
    expect([0, busy, alsoBusy]).not.toContain(result.port)
  })

  test('explicit port taken by another program or by SI Game: failed, nothing listens, no fallback', async () => {
    const busy = portOf(await otherApp())
    const target = http.createServer()
    expect(await listenSafely(target, { port: busy, isExplicit: true, host: HOST, fallbackPorts: [await freePort()] }))
      .toEqual({ status: 'failed', port: busy, reason: 'busy' })

    const sigame = await startServer()
    try {
      const port = Number(new URL(sigame.base).port)
      expect(await listenSafely(target, { port, isExplicit: true, host: HOST })).toEqual({ status: 'failed', port, reason: 'sigame' })
    } finally {
      await sigame.close()
    }

    expect(target.listening).toBe(false)
  })

  test('explicit port 0 is an ephemeral port without probing', async () => {
    const target = http.createServer()
    const result = await listenSafely(target, { port: 0, isExplicit: true, host: HOST })
    opened.push(target)
    expect(result).toEqual({ status: 'listening', port: portOf(target) })
    expect(result.port).toBeGreaterThan(0)
  })

  test('EADDRINUSE / EACCES on listen: the next port when implicit, failed when explicit', async () => {
    const [first, second, third] = [await freePort(), await freePort(), await freePort()]
    const implicit = fake({ [first]: 'EACCES', [second]: 'EADDRINUSE' })
    expect(await listenSafely(implicit.target, { port: first, isExplicit: false, fallbackPorts: [second, third] })).toEqual({ status: 'listening', port: third })
    expect(implicit.server.attempts).toEqual([first, second, third])

    const explicit = fake({ [first]: 'EACCES' })
    const result = await listenSafely(explicit.target, { port: first, isExplicit: true, fallbackPorts: [second] })
    expect(result).toMatchObject({ status: 'failed', port: first, reason: 'error', error: { code: 'EACCES' } })
    expect(explicit.server.attempts).toEqual([first])

    const ephemeral = 0
    const lastResort = fake({ [first]: 'EADDRINUSE', [ephemeral]: 'EADDRINUSE' })
    expect(await listenSafely(lastResort.target, { port: first, isExplicit: false, fallbackPorts: [] }))
      .toMatchObject({ status: 'failed', port: 0, reason: 'error', error: { code: 'EADDRINUSE' } })
    expect(lastResort.server.attempts).toEqual([first, 0])
  })

  test('another listen error stops at once', async () => {
    const [first, second] = [await freePort(), await freePort()]
    const { server, target } = fake({ [first]: 'EINVAL' })
    expect(await listenSafely(target, { port: first, isExplicit: false, fallbackPorts: [second] }))
      .toMatchObject({ status: 'failed', port: first, reason: 'error', error: { code: 'EINVAL' } })
    expect(server.attempts).toEqual([first])
  })

  test('listenOn resolves with the real port and leaves no listeners behind', async () => {
    const listeners = (server: Server) => [server.listenerCount('error'), server.listenerCount('listening')]
    const target = http.createServer()
    const before = listeners(target)
    const port = await listenOn(target, 0, HOST)
    opened.push(target)
    expect(port).toBe(portOf(target))
    expect(listeners(target)).toEqual(before)

    const busy = portOf(await otherApp())
    const second = http.createServer()
    await expect(listenOn(second, busy, HOST)).rejects.toMatchObject({ code: 'EADDRINUSE' })
    expect(listeners(second)).toEqual(before)
    expect(second.listening).toBe(false)
  })
})

describe('listenFailureMessage', () => {
  const failed = (reason: 'busy' | 'sigame' | 'error', code?: string): Extract<ListenResult, { status: 'failed' }> => ({
    status: 'failed',
    port: 4000,
    reason,
    error: code ? Object.assign(new Error(`listen ${code}`), { code }) : undefined,
  })

  test.each([
    [failed('busy'), /Порт 4000 уже занят другой программой.*PORT/],
    [failed('sigame'), /На порту 4000 уже запущена SI Game: http:\/\/10\.0\.0\.2:4000\//],
    [failed('error', 'EADDRINUSE'), /Порт 4000 уже занят.*PORT/],
    [failed('error', 'EACCES'), /порт 4000 \(EACCES\).*PORT/],
    [failed('error', 'EINVAL'), /Не удалось открыть порт 4000: listen EINVAL/],
  ])('%j', (result, expected) => {
    expect(listenFailureMessage(result, 'http://10.0.0.2:4000/')).toMatch(expected)
  })
})

describe('src/index.ts with an explicit PORT that is taken', () => {
  type Run = { code: number | null; stdout: string; stderr: string }

  const runIndex = async (port: number): Promise<Run> => {
    const dir = makeTempDir('index-')
    const child = spawn(process.execPath, ['-r', 'ts-node/register', 'src/index.ts'], {
      cwd: SERVICE_ROOT,
      env: {
        ...process.env,
        PORT: String(port),
        TS_NODE_TRANSPILE_ONLY: 'true',
        SIQ_DIR: path.join(dir, 'siq'),
        PACKAGES_DIR: path.join(dir, 'packages'),
        FRONTEND_STATIC_DIR: path.join(dir, 'public'),
      },
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
    }, 25_000)
    const code = await new Promise<number | null>(resolve => {
      child.once('exit', resolve)
    })
    clearTimeout(timer)
    return { code, stdout, stderr }
  }

  test('taken by another program: a clear error and exit code 1', async () => {
    const port = portOf(await otherApp())
    const result = await runIndex(port)
    expect(result.code).toBe(1)
    expect(result.stderr).toContain(`Порт ${port} уже занят другой программой`)
    expect(result.stdout).not.toContain('SI Game запущена')
  }, 30_000)

  test('taken by SI Game: says so and exits with code 1', async () => {
    const sigame = await startServer()
    try {
      const port = Number(new URL(sigame.base).port)
      const result = await runIndex(port)
      expect(result.code).toBe(1)
      expect(result.stderr).toMatch(new RegExp(`На порту ${port} уже запущена SI Game: http://[\\d.]+:${port}/`))
      expect(result.stdout).not.toContain('SI Game запущена')
    } finally {
      await sigame.close()
    }
  }, 30_000)
})
