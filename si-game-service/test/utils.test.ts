import fs from 'fs'
import os from 'os'
import path from 'path'
import { parseByteRange } from '../src/api/files'
import type * as authModule from '../src/auth'
import type * as configModule from '../src/config'
import * as Schema from '../src/schema'
import { isClientAbort, shouldLogHttpError } from '../src/utils/httpErrors'
import { findPackFile, isPackFileName, uploadFileName } from '../src/utils/packFiles'
import { isPageRequest } from '../src/utils/pageRoutes'
import { isInsideDir, safeDecodeUriComponent } from '../src/utils/paths'
import { numberOf, textList, textOf, toArray } from '../src/utils/siqValue'
import { makeTempDir } from './helpers/fixtures'

describe('paths', () => {
  test('isInsideDir: only paths strictly below the directory', () => {
    const dir = path.resolve('/games/g1')
    expect(isInsideDir(dir, path.join(dir, 'Images', 'a.png'))).toBe(true)
    expect(isInsideDir(dir, path.join(dir, 'Images', '..', 'a.png'))).toBe(true)
    expect(isInsideDir(dir, dir)).toBe(false)
    expect(isInsideDir(dir, path.join(dir, '..'))).toBe(false)
    expect(isInsideDir(dir, path.join(dir, '..', 'g2', 'a.png'))).toBe(false)
    expect(isInsideDir(dir, `${dir}-other`)).toBe(false)
    expect(isInsideDir(dir, path.resolve('/etc/passwd'))).toBe(false)
    expect(isInsideDir(dir, path.join(dir, '..name'))).toBe(true)
  })

  test('safeDecodeUriComponent decodes and never throws', () => {
    expect(safeDecodeUriComponent('pic%201.png')).toBe('pic 1.png')
    expect(safeDecodeUriComponent('..%2F..%2Fx')).toBe('../../x')
    expect(safeDecodeUriComponent('100%.png')).toBe('100%.png')
    expect(safeDecodeUriComponent('%E0%A4%A')).toBe('%E0%A4%A')
  })
})

describe('isPageRequest (SPA fallback)', () => {
  test.each([
    '/',
    '/admin',
    '/admin/',
    '/admin/5f0e2d1c-1b2a-4c3d-8e9f-0a1b2c3d4e5f',
    '/player/5f0e2d1c-1b2a-4c3d-8e9f-0a1b2c3d4e5f/',
    '/a.b/x',
    '/unknown/deep/path',
  ])('%s is a page', requestPath => {
    expect(isPageRequest(requestPath)).toBe(true)
  })

  test.each([
    '/_next/static/chunks/main.js',
    '/_next/data/build/admin.json',
    '/_next/image',
    '/favicon.ico',
    '/admin/app.js',
    '/player/id/picture.PNG',
    '/fonts/inter.woff2/',
    '/api/packs',
    '/api',
    '/socket.io/',
  ])('%s is not a page', requestPath => {
    expect(isPageRequest(requestPath)).toBe(false)
  })
})

describe('siqValue (values produced by fast-xml-parser)', () => {
  test('toArray', () => {
    expect(toArray(undefined)).toEqual([])
    expect(toArray(null)).toEqual([])
    expect(toArray('' as string | string[])).toEqual([])
    expect(toArray('a')).toEqual(['a'])
    expect(toArray(['a', 'b'])).toEqual(['a', 'b'])
    expect(toArray({ x: 1 })).toEqual([{ x: 1 }])
  })

  test('textOf keeps strings, reads #text, joins arrays', () => {
    expect(textOf('007')).toBe('007')
    expect(textOf(7)).toBe('7')
    expect(textOf(false)).toBe('false')
    expect(textOf({ '#text': '1984', attributes: { type: 'text' } })).toBe('1984')
    expect(textOf(['a', { '#text': 'b' }])).toBe('a, b')
    expect(textOf([])).toBeNull()
    expect(textOf({ attributes: { name: 'x' } })).toBeNull()
    expect(textOf(undefined)).toBeNull()
    expect(textOf(null)).toBeNull()
  })

  test('textList skips values without text', () => {
    expect(textList(['a', { attributes: {} }, { '#text': 'c' }])).toEqual(['a', 'c'])
    expect(textList('single')).toEqual(['single'])
    expect(textList(undefined)).toEqual([])
  })

  test('numberOf', () => {
    expect(numberOf('100')).toBe(100)
    expect(numberOf('-1')).toBe(-1)
    expect(numberOf({ '#text': '0' })).toBe(0)
    expect(numberOf('')).toBeNull()
    expect(numberOf('  ')).toBeNull()
    expect(numberOf('abc')).toBeNull()
    expect(numberOf(undefined)).toBeNull()
  })
})

describe('pack file names', () => {
  test('isPackFileName: a plain .siq file name', () => {
    expect(isPackFileName('pack.siq')).toBe(true)
    expect(isPackFileName('Пак №1 & co.SIQ')).toBe(true)
    expect(isPackFileName('.siq')).toBe(false)
    expect(isPackFileName('pack.txt')).toBe(false)
    expect(isPackFileName('pack.siq.txt')).toBe(false)
    expect(isPackFileName('../pack.siq')).toBe(false)
    expect(isPackFileName('dir/pack.siq')).toBe(false)
    expect(isPackFileName('dir\\pack.siq')).toBe(false)
    expect(isPackFileName('..')).toBe(false)
    expect(isPackFileName('')).toBe(false)
    expect(isPackFileName('bad\u0000name.siq')).toBe(false)
    expect(isPackFileName(`${'x'.repeat(252)}.siq`)).toBe(false)
  })

  test('uploadFileName keeps the base name of a client file name', () => {
    expect(uploadFileName('pack.siq')).toBe('pack.siq')
    expect(uploadFileName('../../x.siq')).toBe('x.siq')
    expect(uploadFileName('..\\..\\x.siq')).toBe('x.siq')
    expect(uploadFileName('C:\\Users\\me\\x.siq')).toBe('x.siq')
    expect(uploadFileName('/etc/x.siq')).toBe('x.siq')
    expect(uploadFileName('x.txt')).toBeNull()
    expect(uploadFileName('..')).toBeNull()
    expect(uploadFileName('../')).toBeNull()
    expect(uploadFileName(null)).toBeNull()
    expect(uploadFileName(undefined)).toBeNull()
  })

  test('findPackFile finds existing packs of SIQ_DIR only', async () => {
    const siqDir = process.env.SIQ_DIR!
    fs.writeFileSync(path.join(siqDir, 'present.siq'), 'x')
    fs.writeFileSync(path.join(path.dirname(siqDir), 'outside.siq'), 'x')

    expect(await findPackFile('present.siq')).toBe(path.join(siqDir, 'present.siq'))
    expect(await findPackFile('missing.siq')).toBeNull()
    expect(await findPackFile('../outside.siq')).toBeNull()
    expect(await findPackFile(path.join(siqDir, 'present.siq'))).toBeNull()
  })
})

describe('request schemas', () => {
  test('selectPack accepts a plain .siq name only', () => {
    expect(Schema.requestSelectPack.safeParse({ file: 'pack.siq' }).success).toBe(true)
    expect(Schema.requestSelectPack.safeParse({ file: '../pack.siq' }).success).toBe(false)
    expect(Schema.requestSelectPack.safeParse({ file: '/abs/pack.siq' }).success).toBe(false)
    expect(Schema.requestSelectPack.safeParse({ file: 'pack.zip' }).success).toBe(false)
    expect(Schema.requestSelectPack.safeParse({}).success).toBe(false)
  })

  test('numbers must be finite numbers, volumes 0..100', () => {
    expect(Schema.requestSetScoreValue.safeParse({ value: 0 }).success).toBe(true)
    expect(Schema.requestSetScoreValue.safeParse({ value: -50 }).success).toBe(true)
    expect(Schema.requestSetScoreValue.safeParse({ value: '100' }).success).toBe(false)
    expect(Schema.requestSetScoreValue.safeParse({ value: Number.POSITIVE_INFINITY }).success).toBe(false)
    expect(Schema.requestSetVolumeSettings.safeParse({ player: 0, admin: 100 }).success).toBe(true)
    expect(Schema.requestSetVolumeSettings.safeParse({ player: 101, admin: 0 }).success).toBe(false)
    expect(Schema.requestSetVolumeSettings.safeParse({ player: 1.5, admin: 0 }).success).toBe(false)
    expect(Schema.requestUpdateMediaPlayer.safeParse({ time: -1, isPlaying: true }).success).toBe(false)
  })

  test('names are trimmed and limited', () => {
    expect(Schema.requestUpdatePlayer.parse({ playerId: 'p', name: '  Вася  ' })).toEqual({ playerId: 'p', name: 'Вася' })
    expect(Schema.requestNewGame.safeParse({ gameName: 'x'.repeat(201) }).success).toBe(false)
    expect(Schema.requestVoid.safeParse({}).success).toBe(true)
    expect(Schema.requestVoid.safeParse('text').success).toBe(false)
  })
})

describe('parseByteRange', () => {
  test.each([
    ['bytes=0-99', 1000, { start: 0, end: 99 }],
    ['bytes=100-', 1000, { start: 100, end: 999 }],
    ['bytes=990-5000', 1000, { start: 990, end: 999 }],
    ['bytes=-10', 1000, { start: 990, end: 999 }],
    ['bytes=-5000', 1000, { start: 0, end: 999 }],
    ['bytes=999-999', 1000, { start: 999, end: 999 }],
    [' Bytes = 1 - 2 ', 1000, { start: 1, end: 2 }],
    ['bytes=0-99999999999999999999999', 10, { start: 0, end: 9 }],
    ['bytes=1000-', 1000, 'unsatisfiable'],
    ['bytes=99999999999999999999-', 1000, 'unsatisfiable'],
    ['bytes=-0', 1000, 'unsatisfiable'],
    ['bytes=0-', 0, 'unsatisfiable'],
    ['bytes=-1', 0, 'unsatisfiable'],
    ['bytes=5-4', 1000, null],
    ['bytes=-', 1000, null],
    ['bytes=0-1,5-6', 1000, null],
    ['bytes=a-b', 1000, null],
    ['items=0-1', 1000, null],
    ['', 1000, null],
  ])('%s of %d bytes → %j', (header, size, expected) => {
    expect(parseByteRange(header, size)).toEqual(expected)
  })
})

describe('config (read from the environment at import time)', () => {
  type ConfigModule = typeof configModule
  type AuthModule = typeof authModule

  const load = (env: Record<string, string | undefined>): { config: ConfigModule; auth: AuthModule } => {
    const saved = new Map(Object.keys(env).map(key => [key, process.env[key]]))
    const apply = (values: Map<string, string | undefined>) => {
      for (const [key, value] of values) {
        if (value === undefined) {
          Reflect.deleteProperty(process.env, key)
        } else {
          process.env[key] = value
        }
      }
    }

    apply(new Map(Object.entries(env)))
    try {
      let modules: { config: ConfigModule; auth: AuthModule } | undefined
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        modules = { config: require('../src/config') as ConfigModule, auth: require('../src/auth') as AuthModule }
      })
      return modules!
    } finally {
      apply(saved)
    }
  }

  test('PORT: default 4000, invalid values fall back to it', () => {
    expect(load({ PORT: undefined }).config.PORT).toBe(4000)
    expect(load({ PORT: '' }).config.PORT).toBe(4000)
    expect(load({ PORT: '5000' }).config.PORT).toBe(5000)
    expect(load({ PORT: '0' }).config.PORT).toBe(0)
    expect(load({ PORT: 'abc' }).config.PORT).toBe(4000)
    expect(load({ PORT: '70000' }).config.PORT).toBe(4000)
    expect(load({ PORT: '1.5' }).config.PORT).toBe(4000)
  })

  test('isPortExplicit: only a valid PORT from the environment is explicit', () => {
    expect(load({ PORT: undefined }).config.isPortExplicit).toBe(false)
    expect(load({ PORT: ' ' }).config.isPortExplicit).toBe(false)
    expect(load({ PORT: 'abc' }).config.isPortExplicit).toBe(false)
    expect(load({ PORT: '4000' }).config).toMatchObject({ PORT: 4000, isPortExplicit: true })
    expect(load({ PORT: '0' }).config).toMatchObject({ PORT: 0, isPortExplicit: true })
    expect(load({}).config.DEFAULT_PORT).toBe(4000)
  })

  test('directories are resolved from the environment', () => {
    const { config } = load({ SIQ_DIR: 'relative/siq', PACKAGES_DIR: '/abs/packages', FRONTEND_STATIC_DIR: ' ' })
    expect(config.SIQ_DIR).toBe(path.resolve('relative/siq'))
    expect(config.PACKAGES_DIR).toBe(path.resolve('/abs/packages'))
    expect(config.FRONTEND_STATIC_DIR).toBe(path.resolve(__dirname, '..', 'src', '..', '..', 'public'))
  })

  test('ADMIN_TOKEN is opt-in: unset or blank means every client is an admin', () => {
    for (const token of [undefined, '', '   ']) {
      const { config, auth } = load({ ADMIN_TOKEN: token })
      expect(config.ADMIN_TOKEN).toBeNull()
      expect(auth.isAdminTokenRequired()).toBe(false)
      expect(auth.isAdminToken(undefined)).toBe(true)
    }

    const { config, auth } = load({ ADMIN_TOKEN: 'secret' })
    expect(config.ADMIN_TOKEN).toBe('secret')
    expect(auth.isAdminTokenRequired()).toBe(true)
    expect(auth.isAdminToken('secret')).toBe(true)
    expect(auth.isAdminToken('secreT')).toBe(false)
    expect(auth.isAdminToken('secret2')).toBe(false)
    expect(auth.isAdminToken('')).toBe(false)
    expect(auth.isAdminToken(undefined)).toBe(false)
    expect(auth.isAdminToken(123)).toBe(false)
  })

  test('ADMIN_TOKEN: surrounding whitespace is not part of the token', () => {
    const { config, auth } = load({ ADMIN_TOKEN: ' secret \t' })
    expect(config.ADMIN_TOKEN).toBe('secret')
    expect(auth.isAdminToken('secret')).toBe(true)
    expect(auth.isAdminToken(' secret ')).toBe(true)
    expect(auth.isAdminToken('secret x')).toBe(false)
    expect(auth.isAdminToken('  ')).toBe(false)
  })

  test('defaultDataDir: the working directory for the sources, never for the desktop build', () => {
    const { config } = load({})
    const executableDir = makeTempDir('app-')
    const executable = path.join(executableDir, 'sigame-macos-arm64')

    expect(config.defaultDataDir(false, executable)).toBe(process.cwd())

    const dataHome = makeTempDir('data-')
    const userDirs: Partial<Record<NodeJS.Platform, [string, string]>> = {
      darwin: ['HOME', path.join(os.homedir(), 'Library', 'Application Support', 'SIGame')],
      win32: ['LOCALAPPDATA', path.join(dataHome, 'SIGame')],
      linux: ['XDG_DATA_HOME', path.join(dataHome, 'sigame')],
    }
    const [variable, expected] = userDirs[process.platform] ?? ['XDG_DATA_HOME', path.join(dataHome, 'sigame')]
    const saved = process.env[variable]
    if (variable !== 'HOME') {
      process.env[variable] = dataHome
    }

    try {
      expect(config.defaultDataDir(true, executable)).toBe(expected)
    } finally {
      if (saved === undefined) {
        Reflect.deleteProperty(process.env, variable)
      } else {
        process.env[variable] = saved
      }
    }

    expect(fs.existsSync(path.join(executableDir, 'siq'))).toBe(false)

    fs.mkdirSync(path.join(executableDir, 'siq'))
    expect(config.defaultDataDir(true, executable)).toBe(executableDir)
  })
})

describe('httpErrors', () => {
  const withCode = (code: string, message = 'write failed') => Object.assign(new Error(message), { code })

  test('a client that closes the connection mid-response is not an error worth logging', () => {
    for (const code of ['EPIPE', 'ECONNRESET', 'ECONNABORTED', 'ERR_STREAM_PREMATURE_CLOSE', 'ERR_STREAM_DESTROYED']) {
      expect(isClientAbort(withCode(code))).toBe(true)
      expect(shouldLogHttpError(withCode(code))).toBe(false)
    }

    expect(isClientAbort(new Error('aborted'))).toBe(true)
  })

  test('404 and exposed client errors stay quiet, server faults are logged', () => {
    expect(shouldLogHttpError(Object.assign(new Error('Not Found'), { status: 404 }))).toBe(false)
    expect(shouldLogHttpError(Object.assign(new Error('Bad Request'), { status: 400, expose: true }))).toBe(false)
    expect(shouldLogHttpError(withCode('ENOENT', 'no such file'))).toBe(true)
    expect(shouldLogHttpError(new Error('boom'))).toBe(true)
  })
})
