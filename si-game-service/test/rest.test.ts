import fs from 'fs'
import path from 'path'
import { deletePack, listPacks, startServer, type TestServer, upload, waitUntil } from './helpers/server'
import { makeTempDir, noContentEntries, packageXml, PNG, siq4Entries, siq5Entries, zipBuffer } from './helpers/fixtures'

const siq5 = zipBuffer(siq5Entries())
const siq4 = zipBuffer(siq4Entries())

const storedTogether = (files: string[]) => ({
  status: 200,
  body: { file: expect.stringMatching(/./) as string, files: expect.arrayContaining(files) as string[] },
})

const expectFirstFile = (response: { body: unknown }, count: number) => {
  const { file, files } = response.body as { file: string; files: string[] }
  expect(files).toHaveLength(count)
  expect(files[0]).toBe(file)
}

describe('REST API', () => {
  let server: TestServer
  let staticDir: string

  beforeAll(async () => {
    staticDir = makeTempDir('static-')
    for (const page of ['index', 'admin', 'player']) {
      fs.writeFileSync(path.join(staticDir, `${page}.html`), `<title>${page}</title>`)
    }

    fs.mkdirSync(path.join(staticDir, '_next'))
    fs.writeFileSync(path.join(staticDir, '_next', 'app.js'), 'console.log(1)')

    server = await startServer({ env: { FRONTEND_STATIC_DIR: staticDir } })
  })

  afterAll(async () => {
    await server.close()
  })

  afterEach(() => {
    expect(fs.readdirSync(server.uploadTmpDir)).toEqual([])
  })

  const siqFiles = () => fs.readdirSync(server.siqDir).sort()

  test('GET /api/health identifies the app and its version, without caching', async () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')) as { version: string }
    const response = await fetch(`${server.base}/api/health`)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ app: 'sigame', version: packageJson.version })
    expect((await fetch(`${server.base}/api/health`, { method: 'POST' })).status).toBe(405)
  })

  test('GET /api/fatal is a 404 and the server keeps running', async () => {
    expect((await fetch(`${server.base}/api/fatal`)).status).toBe(404)
    expect((await fetch(`${server.base}/api/packs`)).status).toBe(200)
  })

  describe('upload', () => {
    test('a valid pack is stored and listed', async () => {
      const response = await upload(server.base, [{ name: 'test5.siq', content: siq5 }])
      expect(response).toEqual({ status: 200, body: { file: 'test5.siq' } })
      expect(fs.readFileSync(path.join(server.siqDir, 'test5.siq'))).toEqual(siq5)
      expect(await listPacks(server.base)).toContainEqual({ name: 'Тестовый пак', file: 'test5.siq', isBroken: false })
    })

    test('only the base name of the client file name is used', async () => {
      const parent = path.dirname(server.siqDir)
      for (const [name, stored] of [['../escaped.siq', 'escaped.siq'], ['..\\win.siq', 'win.siq'], ['a/b/../../nested.siq', 'nested.siq']]) {
        // eslint-disable-next-line no-await-in-loop
        expect(await upload(server.base, [{ name, content: siq4 }])).toEqual({ status: 200, body: { file: stored } })
        expect(fs.existsSync(path.join(server.siqDir, stored))).toBe(true)
        expect(fs.existsSync(path.join(parent, stored))).toBe(false)
      }
    })

    test('a unicode name is kept', async () => {
      expect(await upload(server.base, [{ name: 'Пак №1 (финал).siq', content: siq4 }])).toEqual({ status: 200, body: { file: 'Пак №1 (финал).siq' } })
      expect(siqFiles()).toContain('Пак №1 (финал).siq')
    })

    test('names that are not .siq packs are rejected', async () => {
      const before = siqFiles()
      for (const name of ['bad.txt', 'pack.siq.zip', '..', '.siq', 'dir/..']) {
        // eslint-disable-next-line no-await-in-loop
        expect(await upload(server.base, [{ name, content: siq4 }])).toEqual({ status: 400, body: { error: 'INVALID_FILE' } })
      }

      expect(siqFiles()).toEqual(before)
    })

    test('broken packs are rejected with INVALID_SIQ and not stored', async () => {
      const before = siqFiles()
      const broken = [
        { name: 'notzip.siq', content: 'not a zip' },
        { name: 'nocontent.siq', content: zipBuffer(noContentEntries()) },
        { name: 'nopackage.siq', content: zipBuffer({ 'content.xml': '<notapackage/>' }) },
        { name: 'empty.siq', content: '' },
      ]
      for (const file of broken) {
        // eslint-disable-next-line no-await-in-loop
        expect(await upload(server.base, [file])).toEqual({ status: 400, body: { error: 'INVALID_SIQ' } })
      }

      expect(siqFiles()).toEqual(before)
    })

    test('a request without a file is rejected', async () => {
      const form = new FormData()
      form.append('comment', 'no file here')
      const response = await fetch(`${server.base}/api/upload`, { method: 'POST', body: form })
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({ error: 'INVALID_FILE' })

      const json = await fetch(`${server.base}/api/upload`, { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } })
      expect(json.status).toBe(400)
    })

    test('several files in one request are stored together, or none of them', async () => {
      const both = await upload(server.base, [{ name: 'multi4.siq', content: siq4 }, { name: 'multi5.siq', content: siq5 }])
      expect(both).toEqual(storedTogether(['multi4.siq', 'multi5.siq']))
      expectFirstFile(both, 2)

      const before = siqFiles()
      const oneBroken = await upload(server.base, [{ name: 'good.siq', content: siq4 }, { name: 'bad.siq', content: 'not a zip' }])
      expect(oneBroken).toEqual({ status: 400, body: { error: 'INVALID_SIQ' } })
      const oneBadName = await upload(server.base, [{ name: 'good.siq', content: siq4 }, { name: 'bad.txt', content: siq4 }])
      expect(oneBadName).toEqual({ status: 400, body: { error: 'INVALID_FILE' } })
      expect(siqFiles()).toEqual(before)
    })

    test('an upload replaces a pack with the same name, the list shows the new name', async () => {
      await upload(server.base, [{ name: 'same.siq', content: siq5 }])
      expect(await listPacks(server.base)).toContainEqual({ name: 'Тестовый пак', file: 'same.siq', isBroken: false })
      await upload(server.base, [{ name: 'same.siq', content: siq4 }])
      expect(await listPacks(server.base)).toContainEqual({ name: 'SIQ4 пак', file: 'same.siq', isBroken: false })
    })

    test('a malformed multipart body is rejected and its temp file removed', async () => {
      const boundary = 'sigame-test-boundary'
      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="cut.siq"',
        'Content-Type: application/octet-stream',
        '',
        siq4.subarray(0, 100).toString('latin1'),
      ].join('\r\n')
      const response = await fetch(`${server.base}/api/upload`, {
        method: 'POST',
        body: Buffer.from(body, 'latin1'),
        headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      })
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({ error: 'INVALID_FILE' })
      await waitUntil(() => fs.readdirSync(server.uploadTmpDir).length === 0, 'the partial upload is removed')
      expect(siqFiles()).not.toContain('cut.siq')
    })

    test('a file under another field name is rejected and leaves no temp file', async () => {
      const response = await upload(server.base, [{ name: 'other.siq', content: siq4, field: 'attachment' }])
      expect(response).toEqual({ status: 400, body: { error: 'INVALID_FILE' } })
      expect(siqFiles()).not.toContain('other.siq')
    })

    test('files of other fields next to the pack are dropped', async () => {
      const response = await upload(server.base, [
        { name: 'extra.bin', content: Buffer.alloc(1024 * 1024), field: 'extra' },
        { name: 'with-extra.siq', content: siq4 },
        { name: 'pack.siq', content: siq5, field: 'pack' },
      ])
      expect(response).toEqual({ status: 200, body: { file: 'with-extra.siq' } })
      expect(siqFiles()).toContain('with-extra.siq')
      expect(siqFiles()).not.toContain('pack.siq')
    })
  })

  describe('packs', () => {
    test('/api/packs lists .siq files only; a broken pack is listed as broken', async () => {
      fs.writeFileSync(path.join(server.siqDir, 'manual-broken.siq'), 'garbage')
      fs.writeFileSync(path.join(server.siqDir, 'readme.txt'), 'not a pack')
      fs.writeFileSync(path.join(server.siqDir, 'UPPER.SIQ'), zipBuffer({ 'content.xml': packageXml('', { name: 'Большими буквами' }) }))

      const packs = await listPacks(server.base)
      expect(packs.map(pack => pack.file).sort()).toEqual(siqFiles().filter(file => /\.siq$/i.test(file)))
      expect(packs).toContainEqual({ name: '', file: 'manual-broken.siq', isBroken: true })
      expect(packs).toContainEqual({ name: 'Большими буквами', file: 'UPPER.SIQ', isBroken: false })
      expect(packs.some(pack => pack.file === 'readme.txt')).toBe(false)

      expect(await listPacks(server.base)).toEqual(packs)
    })

    test('a valid pack without a name is playable and listed under its file name', async () => {
      const unnamed = zipBuffer({ 'content.xml': packageXml('<question price="100"><params><param name="question" type="content"><item>q</item></param></params></question>').replace(' name="Пак"', '') })
      const blank = zipBuffer({ 'content.xml': packageXml('<question price="100"><params><param name="question" type="content"><item>q</item></param></params></question>', { name: ' ' }) })
      const response = await upload(server.base, [{ name: 'Без имени.SIQ', content: unnamed }, { name: 'blank.siq', content: blank }])
      expect(response).toEqual(storedTogether(['Без имени.SIQ', 'blank.siq']))
      expectFirstFile(response, 2)

      const packs = await listPacks(server.base)
      expect(packs).toContainEqual({ name: 'Без имени', file: 'Без имени.SIQ', isBroken: false })
      expect(packs).toContainEqual({ name: 'blank', file: 'blank.siq', isBroken: false })

      const game = server.app.appState.newGame('Без имени')
      await game.startGame('Без имени.SIQ')
      expect(game.package?.rounds).toHaveLength(1)
      await server.app.appState.closeGame(game.id)
    })

    test('a pack file changed on disk is read again', async () => {
      const file = path.join(server.siqDir, 'changing.siq')
      fs.writeFileSync(file, siq5)
      expect(await listPacks(server.base)).toContainEqual({ name: 'Тестовый пак', file: 'changing.siq', isBroken: false })
      fs.writeFileSync(file, 'broken now')
      expect(await listPacks(server.base)).toContainEqual({ name: '', file: 'changing.siq', isBroken: true })
    })

    test('DELETE removes packs by URI-encoded names', async () => {
      const names = ['a #1 & b+c.siq', 'Пак №2.siq', '100%.siq', 'semi;colon=1.siq']
      for (const name of names) {
        fs.writeFileSync(path.join(server.siqDir, name), siq4)
      }

      for (const name of names) {
        // eslint-disable-next-line no-await-in-loop
        expect(await deletePack(server.base, `?file=${encodeURIComponent(name)}`)).toEqual({ status: 200, body: { message: 'ok' } })
        expect(fs.existsSync(path.join(server.siqDir, name))).toBe(false)
      }

      const listed = (await listPacks(server.base)).map(pack => pack.file)
      expect(listed.filter(file => names.includes(file))).toEqual([])
    })

    test('DELETE of a broken pack works', async () => {
      fs.writeFileSync(path.join(server.siqDir, 'delete-broken.siq'), 'garbage')
      expect((await deletePack(server.base, '?file=delete-broken.siq')).status).toBe(200)
      expect(siqFiles()).not.toContain('delete-broken.siq')
    })

    test('DELETE answers 404 for traversal, missing or non-pack names', async () => {
      const outside = path.join(path.dirname(server.siqDir), 'outside.siq')
      fs.writeFileSync(outside, siq4)
      fs.writeFileSync(path.join(server.siqDir, 'keep.txt'), 'x')

      for (const query of [
        '?file=../outside.siq',
        `?file=${encodeURIComponent('../outside.siq')}`,
        `?file=${encodeURIComponent(outside)}`,
        '?file=missing.siq',
        '?file=keep.txt',
        '?file=',
        '',
        '?file=a.siq&file=b.siq',
      ]) {
        // eslint-disable-next-line no-await-in-loop
        expect(await deletePack(server.base, query)).toEqual({ status: 404, body: { error: 'File not found' } })
      }

      expect(fs.existsSync(outside)).toBe(true)
      expect(siqFiles()).toContain('keep.txt')
    })
  })

  describe('media files', () => {
    test('/api/files serves the extracted media of a game', async () => {
      fs.writeFileSync(path.join(server.siqDir, 'media.siq'), siq5)
      const game = server.app.appState.newGame('Медиа')
      await game.startGame('media.siq')

      const image = await fetch(`${server.base}/api/files/${game.id}/Images/pic%201.png`)
      expect(image.status).toBe(200)
      expect(Buffer.from(await image.arrayBuffer())).toEqual(PNG)
      expect((await fetch(`${server.base}/files/${game.id}/Audio/song.mp3`)).status).toBe(200)
      expect((await fetch(`${server.base}/api/files/${game.id}/Images/missing.png`)).status).toBe(404)
      expect((await fetch(`${server.base}/api/files/${game.id}/..%2F..%2Fsiq%2Fmedia.siq`)).status).not.toBe(200)

      await server.app.appState.closeGame(game.id)
      expect((await fetch(`${server.base}/api/files/${game.id}/Images/pic%201.png`)).status).toBe(404)
    })

    test('/api/files/<gameId>/Html/<name> serves the HTML files of the pack, sandboxed from the app origin', async () => {
      const htmlPack = zipBuffer({
        'content.xml': packageXml(`<question price="100"><params><param name="question" type="content">
          <item type="html" isRef="True">page 1.html</item>
        </param></params><right><answer>a</answer></right></question>`),
        'Html/page%201.html': '<!doctype html><p>Страница</p>',
        'Html/assets/style.css': 'p { color: red }',
      })
      fs.writeFileSync(path.join(server.siqDir, 'html.siq'), htmlPack)
      const game = server.app.appState.newGame('HTML')
      await game.startGame('html.siq')
      game.next()
      game.next()
      game.next()
      game.next()
      game.selectQuestion(game.package!.currentRound.questions[0].id)
      expect(game.package!.currentQuestion!.currentPage).toMatchObject({ html: null, htmlFile: 'page 1.html' })

      const page = await fetch(`${server.base}/api/files/${game.id}/Html/${encodeURIComponent('page 1.html')}`)
      expect(page.status).toBe(200)
      expect(page.headers.get('content-type')).toMatch(/text\/html/)
      expect(page.headers.get('content-security-policy')).toMatch(/^sandbox\b/)
      expect(page.headers.get('content-security-policy')).not.toMatch(/allow-same-origin/)
      expect(await page.text()).toBe('<!doctype html><p>Страница</p>')
      expect(await (await fetch(`${server.base}/api/files/${game.id}/Html/assets/style.css`)).text()).toBe('p { color: red }')
      expect((await fetch(`${server.base}/api/files/${game.id}/Html/missing.html`)).status).toBe(404)
      await server.app.appState.closeGame(game.id)
    })

    describe('byte ranges (seeking in audio / video)', () => {
      const song = Buffer.from('ID3 song')
      const size = song.length
      let url: string

      beforeAll(async () => {
        fs.writeFileSync(path.join(server.siqDir, 'ranges.siq'), siq5)
        const game = server.app.appState.newGame('Диапазоны')
        await game.startGame('ranges.siq')
        url = `${server.base}/api/files/${game.id}/Audio/song.mp3`
      })

      const get = async (range?: string, init: RequestInit = {}) => {
        const response = await fetch(url, { ...init, headers: { ...(range === undefined ? {} : { range }), ...init.headers as Record<string, string> } })
        return {
          status: response.status,
          headers: Object.fromEntries(['accept-ranges', 'content-range', 'content-length', 'content-type'].map(name => [name, response.headers.get(name)])),
          body: Buffer.from(await response.arrayBuffer()),
        }
      }

      test('a whole file says it accepts ranges', async () => {
        const response = await get()
        expect(response.status).toBe(200)
        expect(response.headers).toMatchObject({ 'accept-ranges': 'bytes', 'content-range': null, 'content-length': String(size) })
        expect(response.body).toEqual(song)
      })

      test.each([
        ['bytes=0-', 0, size - 1],
        ['bytes=2-5', 2, 5],
        ['bytes=4-1000', 4, size - 1],
        ['bytes=-3', size - 3, size - 1],
        ['bytes=-1000', 0, size - 1],
      ])('%s → 206 with that part', async (range, start, end) => {
        const response = await get(range)
        expect(response.status).toBe(206)
        expect(response.headers).toMatchObject({
          'accept-ranges': 'bytes',
          'content-range': `bytes ${start}-${end}/${size}`,
          'content-length': String(end - start + 1),
          'content-type': 'audio/mpeg',
        })
        expect(response.body).toEqual(song.subarray(start, end + 1))
      })

      test('a range past the end is 416', async () => {
        const response = await get(`bytes=${size}-`)
        expect(response.status).toBe(416)
        expect(response.headers['content-range']).toBe(`bytes */${size}`)
      })

      test.each(['bytes=0-1,4-5', 'items=0-1', 'bytes=5-2', 'bytes=x-y', 'bytes=-'])('%s is ignored: the whole file', async range => {
        const response = await get(range)
        expect(response.status).toBe(200)
        expect(response.body).toEqual(song)
      })

      test('If-Range: a range of the same file only', async () => {
        const lastModified = (await fetch(url)).headers.get('last-modified')!
        expect((await get('bytes=2-5', { headers: { 'if-range': lastModified } })).status).toBe(206)
        expect((await get('bytes=2-5', { headers: { 'if-range': 'Thu, 01 Jan 1970 00:00:00 GMT' } })).status).toBe(200)
      })

      test('HEAD with a range', async () => {
        const response = await get('bytes=2-5', { method: 'HEAD' })
        expect(response.status).toBe(206)
        expect(response.headers).toMatchObject({ 'content-range': `bytes 2-5/${size}`, 'content-length': '4' })
        expect(response.body).toEqual(Buffer.alloc(0))
      })

      test('/files (the old prefix) supports ranges too; a missing file is still 404', async () => {
        const legacy = await fetch(url.replace('/api/files/', '/files/'), { headers: { range: 'bytes=0-1' } })
        expect(legacy.status).toBe(206)
        expect(Buffer.from(await legacy.arrayBuffer())).toEqual(song.subarray(0, 2))
        expect((await fetch(url.replace('song.mp3', 'missing.mp3'), { headers: { range: 'bytes=0-1' } })).status).toBe(404)
      })
    })
  })

  describe('static frontend with SPA fallback', () => {
    const get = async (url: string, init?: RequestInit) => {
      const response = await fetch(`${server.base}${url}`, init)
      return { status: response.status, type: response.headers.get('content-type') ?? '', body: await response.text() }
    }

    test.each([
      ['/', 'index'],
      ['/admin.html', 'admin'],
      ['/admin/5f0e2d1c-game-id', 'admin'],
      ['/player/5f0e2d1c-game-id', 'player'],
      ['/player/5f0e2d1c-game-id?token=x', 'player'],
      ['/unknown/deep/path', 'index'],
      ['/a.b/x', 'index'],
      ['/admin/', 'admin'],
      ['/admin', 'admin'],
      ['/player/', 'player'],
    ])('GET %s → %s.html', async (url, page) => {
      const response = await get(url)
      expect(response.status).toBe(200)
      expect(response.type).toMatch(/text\/html/)
      expect(response.body).toBe(`<title>${page}</title>`)
    })

    test('static files are served as they are', async () => {
      const response = await get('/_next/app.js')
      expect(response.status).toBe(200)
      expect(response.body).toBe('console.log(1)')
    })

    test('an encoded path that leaves the static dir is refused, not served or replaced by a page', async () => {
      fs.writeFileSync(path.join(path.dirname(staticDir), 'secret.txt'), 'secret')
      for (const url of ['/..%2Fsecret.txt', '/..%2Fadmin/x']) {
        // eslint-disable-next-line no-await-in-loop
        const response = await get(url)
        expect(response.status).toBe(403)
        expect(response.body).not.toContain('secret')
        expect(response.body).not.toContain('<title>')
      }
    })

    test.each([
      '/_next/missing.js',
      '/_next/static/chunks/pages/admin-0123abcd.js',
      '/_next/data/x',
      '/favicon.ico',
      '/missing.css',
      '/admin/missing.js',
      '/player/some-id/image.PNG',
      '/deep/path/file.woff2',
    ])('a missing asset %s is a 404, not a page', async url => {
      const response = await get(url)
      expect(response.status).toBe(404)
      expect(response.body).not.toContain('<title>')
    })

    test('/api, /socket.io and non-GET requests do not fall back to html', async () => {
      expect((await get('/api/unknown')).status).toBe(404)
      expect((await get('/api')).status).toBe(404)
      const post = await get('/admin/some-id', { method: 'POST' })
      expect(post.status).toBe(404)
      expect(post.body).not.toContain('<title>')
    })
  })
})

describe('REST API without a static frontend', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await startServer()
  })

  afterAll(async () => {
    await server.close()
  })

  test('pages are 404, the API works', async () => {
    expect((await fetch(`${server.base}/`)).status).toBe(404)
    expect((await fetch(`${server.base}/admin/some-id`)).status).toBe(404)
    expect(await listPacks(server.base)).toEqual([])
  })
})
