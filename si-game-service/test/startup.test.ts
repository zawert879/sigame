import { spawnSync } from 'child_process'
import { randomUUID } from 'crypto'
import fs from 'fs'
import type { AddressInfo } from 'net'
import path from 'path'
import { removeStaleMedia } from '../src/utils/packages'
import { listFiles, makeTempDir, PNG, siq4Entries, writeZip } from './helpers/fixtures'
import { loadApp, type LoadedApp, startServer } from './helpers/server'

const deadPid = (): number => {
  const { pid, status } = spawnSync(process.execPath, ['-e', ''])
  if (pid === undefined || status !== 0) {
    throw new Error('could not run a child process')
  }

  return pid
}

const runDir = (pid: number): string => `run-${pid}-${randomUUID()}`

function fillPackagesDir(packagesDir: string) {
  const outside = makeTempDir('user-')
  fs.writeFileSync(path.join(outside, 'keep.txt'), 'user data')
  const entries = {
    legacyGame: randomUUID(),
    deadRun: runDir(deadPid()),
    samePidRun: runDir(process.pid),
    liveRun: runDir(process.ppid),
    userDir: 'my-project',
    oldNamedDir: 'stale-game',
    uuidFile: randomUUID(),
    uuidLink: randomUUID(),
    upperCaseUuid: randomUUID().toUpperCase(),
    otherRun: `run-x-${randomUUID()}`,
  }

  for (const name of [entries.legacyGame, entries.deadRun, entries.samePidRun, entries.liveRun, entries.upperCaseUuid, entries.otherRun]) {
    fs.mkdirSync(path.join(packagesDir, name, randomUUID(), 'Images'), { recursive: true })
    fs.writeFileSync(path.join(packagesDir, name, 'Images.png'), PNG)
  }

  fs.mkdirSync(path.join(packagesDir, entries.userDir))
  fs.writeFileSync(path.join(packagesDir, entries.userDir, 'notes.txt'), 'user data')
  fs.mkdirSync(path.join(packagesDir, entries.oldNamedDir, 'Images'), { recursive: true })
  fs.writeFileSync(path.join(packagesDir, entries.uuidFile), 'a file, not a directory')
  fs.symlinkSync(outside, path.join(packagesDir, entries.uuidLink), 'dir')

  const kept = [entries.liveRun, entries.userDir, entries.oldNamedDir, entries.uuidFile, entries.uuidLink, entries.upperCaseUuid, entries.otherRun]
  return { entries, kept: kept.sort(), all: [...kept, entries.legacyGame, entries.deadRun, entries.samePidRun].sort(), outside }
}

describe('startup: media of earlier runs', () => {
  test('are removed once the server listens; nothing else in PACKAGES_DIR is touched', async () => {
    let prepared: ReturnType<typeof fillPackagesDir> | undefined
    const loaded = loadApp({
      prepare({ packagesDir }) {
        prepared = fillPackagesDir(packagesDir)
      },
    })
    const { kept, all, outside } = prepared!
    try {
      expect(fs.readdirSync(loaded.packagesDir).sort()).toEqual(all)

      await new Promise<void>(resolve => {
        loaded.app.httpServer.listen(0, '127.0.0.1', resolve)
      })
      expect(fs.readdirSync(loaded.packagesDir).sort()).toEqual(kept)
      expect(listFiles(path.join(loaded.packagesDir, 'my-project'))).toEqual(['notes.txt'])
      expect(listFiles(outside)).toEqual(['keep.txt'])
    } finally {
      await new Promise<void>(resolve => {
        loaded.app.io.close(() => {
          resolve()
        })
      })
    }
  })

  test('a second copy on a taken port exits without touching the media of the running one', async () => {
    const first = await startServer({
      prepare({ siqDir }) {
        writeZip(path.join(siqDir, 'test4.siq'), siq4Entries())
      },
    })
    let second: LoadedApp | undefined
    try {
      const game = first.app.defaultGame
      await game.startGame('test4.siq')
      const image = `${first.base}/api/files/${game.id}/Images/cat.png`
      expect((await fetch(image)).status).toBe(200)
      const deadRun = path.join(first.packagesDir, runDir(deadPid()))
      fs.mkdirSync(deadRun)

      second = loadApp({ dirs: { siqDir: first.siqDir, packagesDir: first.packagesDir, uploadTmpDir: first.uploadTmpDir } })
      const { app } = second
      expect(fs.existsSync(deadRun)).toBe(true)

      const { port } = first.app.httpServer.address() as AddressInfo
      const error = await new Promise<NodeJS.ErrnoException>((resolve, reject) => {
        app.httpServer.once('error', resolve)
        app.httpServer.listen(port, '127.0.0.1', () => {
          reject(new Error('the second copy listens on a taken port'))
        })
      })
      expect(error.code).toBe('EADDRINUSE')

      expect(fs.existsSync(path.join(game.packDir, 'Images', 'cat.png'))).toBe(true)
      expect((await fetch(image)).status).toBe(200)
      expect(fs.existsSync(deadRun)).toBe(true)
    } finally {
      second?.app.io.close()
      await first.close()
    }
  })

  test('removeStaleMedia: the directory of this process and of running copies are kept', () => {
    const packagesDir = makeTempDir('packages-')
    const own = path.join(packagesDir, runDir(process.pid))
    const live = path.join(packagesDir, runDir(process.ppid))
    const dead = path.join(packagesDir, runDir(deadPid()))
    for (const dir of [own, live, dead]) {
      fs.mkdirSync(path.join(dir, randomUUID()), { recursive: true })
    }

    removeStaleMedia(packagesDir, own)
    expect(fs.readdirSync(packagesDir).sort()).toEqual([own, live].map(dir => path.basename(dir)).sort())

    removeStaleMedia(path.join(packagesDir, 'missing'), own)
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(path.join(packagesDir, 'missing')), expect.anything())
  })
})

describe('startup: HTTP server', () => {
  test('a pack upload may take long: the whole request gets hours, an idle connection still closes', () => {
    const { app } = loadApp()
    try {
      expect(app.httpServer.requestTimeout).toBeGreaterThanOrEqual(60 * 60 * 1000)
      expect(app.httpServer.timeout).toBe(5 * 60 * 1000)
      expect(app.httpServer.headersTimeout).toBeLessThanOrEqual(60 * 1000)
    } finally {
      app.io.close()
    }
  })
})
