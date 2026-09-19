import { type ChildProcessWithoutNullStreams, spawn } from 'child_process'
import EventEmitter from 'eventemitter3'
import fs from 'fs'
import http from 'http'
import type { AddressInfo } from 'net'
import path from 'path'
import {
  countPacks,
  failedLine,
  LauncherStatus,
  type LauncherStatusInfo,
  type ReadyInfo,
  readyLine,
  reportStatus,
  socketRole,
  statusLine,
} from '../src/launcherStatus'
import { makeTempDir, siq5Entries, writeZip, zipBuffer } from './helpers/fixtures'
import { deletePack, startServer, TestClient, type TestServer, upload, waitUntil } from './helpers/server'

const SERVICE_ROOT = path.join(__dirname, '..')
const VERSION = (JSON.parse(fs.readFileSync(path.join(SERVICE_ROOT, 'package.json'), 'utf8')) as { version: string }).version

class FakeSocket extends EventEmitter {
  readonly handshake: { auth: unknown }

  constructor(auth: unknown) {
    super()
    this.handshake = { auth }
  }
}

const touch = (dir: string, ...names: string[]) => {
  for (const name of names) {
    fs.writeFileSync(path.join(dir, name), 'x')
  }
}

describe('launcher lines', () => {
  test('SIGAME_READY: one line with every field of the contract', () => {
    const line = readyLine({
      version: '1.0.0',
      port: 4000,
      addresses: [{ address: '192.168.1.135', name: 'en0', score: 350 }, { address: '10.0.0.5', name: 'Ethernet', score: 100 }],
      gameId: 'f3a0c2e4-1111-4222-8333-444455556666',
      adminToken: null,
      siqDir: '/Users/host/Library/Application Support/SIGame/siq',
      packsCount: 3,
    })
    expect(line).toBe('SIGAME_READY {"version":"1.0.0","port":4000,'
      + '"addresses":[{"address":"192.168.1.135","name":"en0","score":350},{"address":"10.0.0.5","name":"Ethernet","score":100}],'
      + '"gameId":"f3a0c2e4-1111-4222-8333-444455556666","adminToken":null,'
      + '"siqDir":"/Users/host/Library/Application Support/SIGame/siq","packsCount":3}')
  })

  test('SIGAME_READY: no addresses, a token and a Windows path stay one line of valid JSON', () => {
    const line = readyLine({
      version: '2.0.0',
      port: 50_123,
      addresses: [],
      gameId: 'g',
      adminToken: 'se"cret',
      siqDir: 'C:\\Users\\Хост\\AppData\\Local\\SIGame\\siq',
      packsCount: 0,
    })
    expect(line).not.toContain('\n')
    expect(line.startsWith('SIGAME_READY {')).toBe(true)
    expect(JSON.parse(line.slice('SIGAME_READY '.length))).toEqual({
      version: '2.0.0',
      port: 50_123,
      addresses: [],
      gameId: 'g',
      adminToken: 'se"cret',
      siqDir: 'C:\\Users\\Хост\\AppData\\Local\\SIGame\\siq',
      packsCount: 0,
    })
  })

  test('SIGAME_STATUS', () => {
    expect(statusLine({ connections: { player: 1, admin: 2 }, packsCount: 3 }))
      .toBe('SIGAME_STATUS {"connections":{"player":1,"admin":2},"packsCount":3}')
  })

  test('SIGAME_FAILED keeps Russian text as is and never breaks the line', () => {
    expect(failedLine('Порт 4000 уже занят')).toBe('SIGAME_FAILED {"message":"Порт 4000 уже занят"}')
    const line = failedLine('первая\nвторая')
    expect(line).not.toContain('\n')
    expect(JSON.parse(line.slice('SIGAME_FAILED '.length))).toEqual({ message: 'первая\nвторая' })
  })
})

describe('socketRole', () => {
  test.each([
    [{ role: 'player' }, 'player'],
    [{ role: 'admin', token: 't' }, 'admin'],
    [{ role: 'Admin' }, null],
    [{ role: 'tv' }, null],
    [{ role: ['admin'] }, null],
    [{ token: 't' }, null],
    [{}, null],
    ['admin', null],
    [null, null],
    [undefined, null],
  ])('%j → %s', (auth, expected) => {
    expect(socketRole(auth)).toBe(expected)
  })
})

describe('LauncherStatus: connections', () => {
  test('counts sockets by role until they disconnect; sockets without a role are ignored', () => {
    const status = new LauncherStatus(makeTempDir('siq-'))
    const changes = jest.fn()
    status.onChange(changes)
    const player = new FakeSocket({ role: 'player' })
    const otherPlayer = new FakeSocket({ role: 'player' })
    const admin = new FakeSocket({ role: 'admin', token: 't' })
    const unknown = new FakeSocket({ token: 't' })
    for (const socket of [player, otherPlayer, admin, unknown]) {
      status.trackSocket(socket)
    }

    expect(status.status().connections).toEqual({ player: 2, admin: 1 })
    expect(changes).toHaveBeenCalledTimes(3)

    unknown.emit('disconnect')
    player.emit('disconnect')
    player.emit('disconnect')
    expect(status.status().connections).toEqual({ player: 1, admin: 1 })
    expect(changes).toHaveBeenCalledTimes(4)

    otherPlayer.emit('disconnect')
    admin.emit('disconnect')
    expect(status.status().connections).toEqual({ player: 0, admin: 0 })
  })

  test('status() is a copy and onChange can be cancelled', () => {
    const status = new LauncherStatus(makeTempDir('siq-'))
    const changes = jest.fn()
    const off = status.onChange(changes)
    const snapshot = status.status()
    status.addConnection('admin')
    expect(snapshot.connections.admin).toBe(0)
    off()
    status.addConnection('admin')
    expect(changes).toHaveBeenCalledTimes(1)
    expect(status.status().connections.admin).toBe(2)
  })
})

describe('LauncherStatus: packs', () => {
  test('countPacks: .siq files in any case, not directories or other files; a missing directory is 0', async () => {
    const dir = makeTempDir('siq-')
    touch(dir, 'a.siq', 'B.SIQ', 'c.Siq', 'notes.txt', 'd.siq.part', '.e.part')
    fs.mkdirSync(path.join(dir, 'folder.siq'))
    expect(await countPacks(dir)).toBe(3)
    expect(await countPacks(path.join(dir, 'missing'))).toBe(0)
  })

  test('refreshPacks reports a change only when the number differs', async () => {
    const dir = makeTempDir('siq-')
    const status = new LauncherStatus(dir)
    const changes = jest.fn()
    status.onChange(changes)
    expect(await status.refreshPacks()).toBe(0)
    expect(changes).not.toHaveBeenCalled()

    touch(dir, 'one.siq', 'two.siq')
    expect(await status.refreshPacks()).toBe(2)
    expect(status.packsCount).toBe(2)
    expect(changes).toHaveBeenCalledTimes(1)

    expect(await status.refreshPacks()).toBe(2)
    expect(changes).toHaveBeenCalledTimes(1)
  })

  test('watchPacks recounts on its own until stopped', async () => {
    const dir = makeTempDir('siq-')
    const status = new LauncherStatus(dir)
    const stop = status.watchPacks(20)
    try {
      touch(dir, 'one.siq')
      await waitUntil(() => status.packsCount === 1, 'the first pack is counted')
      touch(dir, 'two.siq')
      await waitUntil(() => status.packsCount === 2, 'the second pack is counted')
    } finally {
      stop()
    }

    touch(dir, 'three.siq')
    await new Promise(resolve => {
      setTimeout(resolve, 100)
    })
    expect(status.packsCount).toBe(2)
  })
})

describe('reportStatus', () => {
  const parse = (line: string): LauncherStatusInfo => JSON.parse(line.slice('SIGAME_STATUS '.length)) as LauncherStatusInfo

  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('the first line at once, then at most one line per 300 ms with the latest values', () => {
    const status = new LauncherStatus(makeTempDir('siq-'))
    const lines: string[] = []
    const stop = reportStatus(status, line => lines.push(line))
    expect(lines).toEqual(['SIGAME_STATUS {"connections":{"player":0,"admin":0},"packsCount":0}'])

    jest.advanceTimersByTime(1000)
    const release = status.addConnection('player')
    expect(parse(lines[1]).connections).toEqual({ player: 1, admin: 0 })
    expect(lines).toHaveLength(2)

    jest.advanceTimersByTime(100)
    status.addConnection('admin')
    status.addConnection('player')
    release()
    expect(lines).toHaveLength(2)
    jest.advanceTimersByTime(199)
    expect(lines).toHaveLength(2)
    jest.advanceTimersByTime(1)
    expect(lines).toHaveLength(3)
    expect(parse(lines[2]).connections).toEqual({ player: 1, admin: 1 })

    jest.advanceTimersByTime(1000)
    expect(lines).toHaveLength(3)
    stop()
  })

  test('a change undone within the window prints nothing', () => {
    const status = new LauncherStatus(makeTempDir('siq-'))
    const lines: string[] = []
    const stop = reportStatus(status, line => lines.push(line))
    const release = status.addConnection('admin')
    release()
    jest.advanceTimersByTime(300)
    expect(lines).toHaveLength(1)
    stop()
  })

  test('nothing is printed after stop, even a pending line', () => {
    const status = new LauncherStatus(makeTempDir('siq-'))
    const lines: string[] = []
    const stop = reportStatus(status, line => lines.push(line))
    status.addConnection('player')
    stop()
    jest.advanceTimersByTime(1000)
    status.addConnection('player')
    expect(lines).toHaveLength(1)
  })

  test('a custom interval', () => {
    const status = new LauncherStatus(makeTempDir('siq-'))
    const lines: string[] = []
    const stop = reportStatus(status, line => lines.push(line), 50)
    status.addConnection('player')
    expect(lines).toHaveLength(1)
    jest.advanceTimersByTime(50)
    expect(lines).toHaveLength(2)
    stop()
  })
})

describe('the running server keeps the launcher status', () => {
  let server: TestServer
  const clients: TestClient[] = []

  const connect = async (auth?: Record<string, unknown>) => {
    const client = new TestClient(server.base, auth)
    clients.push(client)
    return client.connected()
  }

  beforeEach(async () => {
    server = await startServer()
  })

  afterEach(async () => {
    for (const client of clients.splice(0)) {
      client.close()
    }

    await server.close()
  })

  test('socket.io connections by handshake role', async () => {
    const { launcherStatus } = server.app
    const player = await connect({ role: 'player' })
    await connect({ role: 'player' })
    const admin = await connect({ role: 'admin', token: 'anything' })
    await connect()
    await connect({ role: 'viewer' })
    await waitUntil(() => launcherStatus.status().connections.player === 2 && launcherStatus.status().connections.admin === 1, 'every socket is counted')

    player.close()
    admin.close()
    await waitUntil(() => launcherStatus.status().connections.player === 1 && launcherStatus.status().connections.admin === 0, 'closed sockets are released')
  })

  test('the number of packs follows an upload and a delete at once', async () => {
    const { launcherStatus } = server.app
    expect(await launcherStatus.refreshPacks()).toBe(0)

    expect((await upload(server.base, [{ name: 'test5.siq', content: zipBuffer(siq5Entries()) }])).status).toBe(200)
    await waitUntil(() => launcherStatus.packsCount === 1, 'the uploaded pack is counted')

    expect((await deletePack(server.base, '?file=test5.siq')).status).toBe(200)
    await waitUntil(() => launcherStatus.packsCount === 0, 'the deleted pack is not counted')
  })
})

type LauncherRun = {
  child: ChildProcessWithoutNullStreams;
  lines: string[];
  stderr: () => string;
  exited: Promise<number | null>;
  waitForLine: (match: (line: string) => boolean, description: string, timeout?: number) => Promise<string>;
}

const runLauncher = (env: Record<string, string>): LauncherRun => {
  const dir = makeTempDir('launcher-')
  const child = spawn(process.execPath, ['-r', 'ts-node/register', 'src/index.ts'], {
    cwd: SERVICE_ROOT,
    env: {
      ...process.env,
      SIGAME_LAUNCHER: '1',
      TS_NODE_TRANSPILE_ONLY: 'true',
      SIQ_DIR: path.join(dir, 'siq'),
      PACKAGES_DIR: path.join(dir, 'packages'),
      FRONTEND_STATIC_DIR: path.join(dir, 'public'),
      ...env,
    },
  })
  const lines: string[] = []
  let pending = ''
  let stderr = ''
  child.stdout.on('data', (chunk: Buffer) => {
    pending += chunk.toString()
    const parts = pending.split('\n')
    pending = parts.pop() ?? ''
    lines.push(...parts)
  })
  child.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString()
  })
  const timer = setTimeout(() => {
    child.kill('SIGKILL')
  }, 25_000)
  const exited = new Promise<number | null>(resolve => {
    child.once('exit', code => {
      clearTimeout(timer)
      resolve(code)
    })
  })

  const waitForLine = async (match: (line: string) => boolean, description: string, timeout = 15_000) => {
    await waitUntil(() => lines.some(line => match(line)) || child.exitCode !== null, description, timeout)
    const found = lines.find(line => match(line))
    if (found === undefined) {
      throw new Error(`${description}: the server exited with ${child.exitCode}, stdout: ${lines.join('\n')}, stderr: ${stderr}`)
    }

    return found
  }

  return { child, lines, stderr: () => stderr, exited, waitForLine }
}

const payloadOf = <T>(line: string, prefix: string): T => {
  expect(line.startsWith(`${prefix} `)).toBe(true)
  return JSON.parse(line.slice(prefix.length + 1)) as T
}

const isStatus = (predicate: (status: LauncherStatusInfo) => boolean) => (line: string) =>
  line.startsWith('SIGAME_STATUS ') && predicate(payloadOf<LauncherStatusInfo>(line, 'SIGAME_STATUS'))

describe('src/index.ts with SIGAME_LAUNCHER=1', () => {
  test('READY, STATUS, role counting and exit when stdin closes', async () => {
    const siqDir = path.join(makeTempDir('launcher-siq-'), 'siq')
    fs.mkdirSync(siqDir)
    writeZip(path.join(siqDir, 'one.siq'), siq5Entries())
    writeZip(path.join(siqDir, 'two.siq'), siq5Entries())
    const run = runLauncher({ PORT: '0', SIQ_DIR: siqDir })
    const clients: TestClient[] = []
    try {
      const ready = payloadOf<ReadyInfo>(await run.waitForLine(line => line.startsWith('SIGAME_READY '), 'READY'), 'SIGAME_READY')
      expect(Object.keys(ready)).toEqual(['version', 'port', 'addresses', 'gameId', 'adminToken', 'siqDir', 'packsCount'])
      expect(ready).toMatchObject({ version: VERSION, adminToken: null, siqDir, packsCount: 2 })
      expect(Number.isInteger(ready.port) && ready.port > 0).toBe(true)
      expect(ready.gameId).toMatch(/^[\da-f-]{36}$/)
      expect(Array.isArray(ready.addresses)).toBe(true)
      for (const address of ready.addresses) {
        expect(Object.keys(address)).toEqual(['address', 'name', 'score'])
        expect([typeof address.address, typeof address.name, typeof address.score]).toEqual(['string', 'string', 'number'])
      }

      const readyIndex = run.lines.findIndex(line => line.startsWith('SIGAME_READY '))
      expect(run.lines[readyIndex + 1]).toBe('SIGAME_STATUS {"connections":{"player":0,"admin":0},"packsCount":2}')
      expect(run.lines.join('\n')).not.toContain('SI Game запущена')

      const base = `http://127.0.0.1:${ready.port}`
      const health = await (await fetch(`${base}/api/health`)).json() as unknown
      expect(health).toEqual({ app: 'sigame', version: VERSION })

      clients.push(await new TestClient(base, { role: 'player' }).connected())
      await run.waitForLine(isStatus(({ connections }) => connections.player === 1 && connections.admin === 0), 'STATUS with the player')
      clients.push(await new TestClient(base, { role: 'admin' }).connected(), await new TestClient(base).connected())
      await run.waitForLine(isStatus(({ connections }) => connections.player === 1 && connections.admin === 1), 'STATUS with the host')
      fs.rmSync(path.join(siqDir, 'one.siq'))
      await run.waitForLine(isStatus(({ packsCount }) => packsCount === 1), 'STATUS after the pack disappeared', 8000)

      for (const client of clients.splice(0)) {
        client.close()
      }

      await run.waitForLine(isStatus(({ connections, packsCount }) => connections.player === 0 && connections.admin === 0 && packsCount === 1), 'STATUS after everyone left')
      expect(run.child.exitCode).toBeNull()

      const statusLines = run.lines.filter(line => line.startsWith('SIGAME_STATUS '))
      expect(new Set(statusLines).size).toBeGreaterThan(1)
      expect(statusLines.every((line, index) => index === 0 || line !== statusLines[index - 1])).toBe(true)

      const stopped = Date.now()
      run.child.stdin.end()
      expect(await run.exited).toBe(0)
      expect(Date.now() - stopped).toBeLessThan(3000)
      expect(run.lines.filter(line => line.startsWith('SIGAME_READY '))).toHaveLength(1)
    } finally {
      for (const client of clients) {
        client.close()
      }

      run.child.kill('SIGKILL')
    }
  }, 30_000)

  test('stdin already at its end: READY is printed and the server exits', async () => {
    const run = runLauncher({ PORT: '0', ADMIN_TOKEN: 'host-secret' })
    run.child.stdin.end()
    try {
      const code = await run.exited
      const ready = payloadOf<ReadyInfo>(run.lines.find(line => line.startsWith('SIGAME_READY ')) ?? '', 'SIGAME_READY')
      expect(ready).toMatchObject({ adminToken: 'host-secret', packsCount: 0 })
      expect(code).toBe(0)
    } finally {
      run.child.kill('SIGKILL')
    }
  }, 30_000)

  test('a port that cannot be opened: SIGAME_FAILED on stdout and exit code 1', async () => {
    const other = http.createServer((_, response) => {
      response.end('hello')
    })
    await new Promise<void>(resolve => {
      other.listen(0, '127.0.0.1', resolve)
    })
    const { port } = other.address() as AddressInfo
    const run = runLauncher({ PORT: String(port) })
    try {
      expect(await run.exited).toBe(1)
      const failed = payloadOf<{ message: string }>(run.lines.find(line => line.startsWith('SIGAME_FAILED ')) ?? '', 'SIGAME_FAILED')
      expect(failed.message).toContain(`Порт ${port} уже занят другой программой`)
      expect(run.lines.some(line => line.startsWith('SIGAME_READY '))).toBe(false)
    } finally {
      run.child.kill('SIGKILL')
      await new Promise<void>(resolve => {
        other.close(() => {
          resolve()
        })
      })
    }
  }, 30_000)
})
