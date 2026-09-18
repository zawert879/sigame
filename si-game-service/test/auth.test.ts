import fs from 'fs'
import path from 'path'
import { AckErrorCode, Event } from '../src/data'
import type { Player, ResponseGetGame, ResponseGetGames, ResponseNewGame } from '../src/types'
import { siq4Entries, writeZip, zipBuffer } from './helpers/fixtures'
import { deletePack, listPacks, startServer, TestClient, type TestServer, upload } from './helpers/server'

const TOKEN = 'secret-token'

const publicEvents: string[] = [Event.GetGames, Event.GetGame, Event.SelectGame, Event.GetPlayers, Event.GetSettings, Event.KeyPress]
const adminEvents = Object.values(Event).filter(event => !/^on[A-Z]/.test(event) && !publicEvents.includes(event))

describe('ADMIN_TOKEN', () => {
  let server: TestServer
  let clients: TestClient[] = []
  let gameId: string

  const connect = async (token?: unknown): Promise<TestClient> => {
    const client = new TestClient(server.base, token === undefined ? undefined : { token })
    clients.push(client)
    await client.connected()
    return client
  }

  beforeAll(async () => {
    server = await startServer({
      env: { ADMIN_TOKEN: TOKEN },
      prepare({ siqDir }) {
        writeZip(path.join(siqDir, 'test4.siq'), siq4Entries())
      },
    })
    gameId = server.app.defaultGame.id
  })

  afterEach(() => {
    for (const client of clients) {
      client.close()
    }

    clients = []
    expect(fs.readdirSync(server.uploadTmpDir)).toEqual([])
  })

  afterAll(async () => {
    await server.close()
  })

  test('public requests work without a token', async () => {
    const display = await connect()
    expect(await display.request<ResponseGetGames>(Event.GetGames)).toContainEqual(expect.objectContaining({ gameId }))
    expect((await display.request<ResponseGetGame>(Event.GetGame, { gameId })).gameId).toBe(gameId)
    expect(await display.request(Event.SelectGame, { gameId })).toEqual({})
    expect(Array.isArray(await display.request(Event.GetPlayers))).toBe(true)
    expect(await display.request(Event.GetSettings)).toMatchObject({ big: 100 })
    expect(await display.request(Event.KeyPress, { key: 'a', code: 'KeyA' })).toEqual({})
  })

  test('every other request is UNAUTHORIZED without the token, whatever the payload', async () => {
    const display = await connect()
    await display.request(Event.SelectGame, { gameId })
    const playersBefore = await display.request<Player[]>(Event.GetPlayers)
    const gamesBefore = await display.request<ResponseGetGames>(Event.GetGames)
    for (const event of adminEvents) {
      for (const payload of [{}, undefined, { gameName: 'x', file: 'test4.siq', playerId: 'p', value: 1 }]) {
        // eslint-disable-next-line no-await-in-loop
        const response = await display.ackError(event, payload)
        expect([event, response.error]).toEqual([event, AckErrorCode.Unauthorized])
      }
    }

    expect(await display.request<Player[]>(Event.GetPlayers)).toEqual(playersBefore)
    expect(await display.request<ResponseGetGames>(Event.GetGames)).toEqual(gamesBefore)
  })

  test('a wrong token is no token', async () => {
    for (const token of ['wrong', `${TOKEN}x`, '', 42, { token: TOKEN }]) {
      // eslint-disable-next-line no-await-in-loop
      const client = await connect(token)
      // eslint-disable-next-line no-await-in-loop
      await client.request(Event.SelectGame, { gameId })
      // eslint-disable-next-line no-await-in-loop
      expect((await client.ackError(Event.Next)).error).toBe(AckErrorCode.Unauthorized)
    }
  })

  test('with the token every request is allowed', async () => {
    const admin = await connect(TOKEN)
    const { gameId: ownGame } = await admin.request<ResponseNewGame>(Event.NewGame, { gameName: 'Своя' })
    expect(await admin.request(Event.SelectGame, { gameId: ownGame })).toEqual({})
    expect(await admin.request(Event.AddPlayer)).toEqual({})
    expect(await admin.request(Event.SelectPack, { file: 'test4.siq' })).toEqual({})
    expect(await admin.request(Event.Next)).toEqual({})
    expect(await admin.request(Event.SetScoreValue, { value: 10 })).toEqual({})

    const display = await connect()
    await display.request(Event.SelectGame, { gameId: ownGame })
    const from = display.mark()
    await admin.request(Event.Next)
    await display.waitFor(Event.OnStartRoundName, { from })

    expect(await admin.request(Event.Exit)).toEqual({})
    await display.waitFor(Event.OnExit, { from })
  })

  describe('REST', () => {
    const content = zipBuffer(siq4Entries())

    test('uploads need the token in the x-admin-token header or the token query param', async () => {
      expect(await upload(server.base, [{ name: 'no-token.siq', content }])).toEqual({ status: 401, body: { error: 'UNAUTHORIZED' } })
      expect(await upload(server.base, [{ name: 'wrong.siq', content }], { headers: { 'x-admin-token': 'wrong' } }))
        .toEqual({ status: 401, body: { error: 'UNAUTHORIZED' } })
      expect(await upload(server.base, [{ name: 'wrong.siq', content }], { query: '?token=wrong' })).toMatchObject({ status: 401 })
      expect(await upload(server.base, [{ name: 'header.siq', content }], { headers: { 'x-admin-token': TOKEN } }))
        .toEqual({ status: 200, body: { file: 'header.siq' } })
      expect(await upload(server.base, [{ name: 'query.siq', content }], { query: `?token=${TOKEN}` }))
        .toEqual({ status: 200, body: { file: 'query.siq' } })
      expect(fs.readdirSync(server.siqDir).sort()).toEqual(['header.siq', 'query.siq', 'test4.siq'])
    })

    test('the pack list is public, deleting needs the token', async () => {
      expect((await listPacks(server.base)).map(pack => pack.file)).toContain('test4.siq')
      fs.writeFileSync(path.join(server.siqDir, 'to-delete.siq'), content)

      expect(await deletePack(server.base, '?file=to-delete.siq')).toEqual({ status: 401, body: { error: 'UNAUTHORIZED' } })
      expect(await deletePack(server.base, '?file=to-delete.siq', { 'x-admin-token': 'wrong' })).toMatchObject({ status: 401 })
      expect(fs.existsSync(path.join(server.siqDir, 'to-delete.siq'))).toBe(true)
      expect(await deletePack(server.base, '?file=to-delete.siq', { 'x-admin-token': TOKEN })).toEqual({ status: 200, body: { message: 'ok' } })
      expect(fs.existsSync(path.join(server.siqDir, 'to-delete.siq'))).toBe(false)
    })

    test('CORS preflight allows the x-admin-token header', async () => {
      const response = await fetch(`${server.base}/api/packs?file=x.siq`, {
        method: 'OPTIONS',
        headers: { origin: 'http://localhost:3000', 'access-control-request-method': 'DELETE', 'access-control-request-headers': 'x-admin-token' },
      })
      expect(response.status).toBe(204)
      expect(response.headers.get('access-control-allow-origin')).toBe('*')
      expect(response.headers.get('access-control-allow-headers')).toContain('x-admin-token')
    })
  })
})
