import type EventEmitter from 'eventemitter3'
import fs from 'fs'
import path from 'path'
import { AckErrorCode, Event, QuestionAnswerType, QuestionType, RoundType, Screen } from '../src/data'
import type { Game } from '../src/entity/Game'
import { GameEvent } from '../src/events'
import type {
  AckError,
  EventStartQuestion,
  EventStartResults,
  EventStartTable,
  EventUpdatePlayers,
  EventUpdateQuestionPage,
  Player,
  ResponseGetGame,
  ResponseGetGames,
  ResponseGetSettings,
  ResponseNewGame,
} from '../src/types'
import { page, siq4Entries, siq5Entries, writeZip } from './helpers/fixtures'
import { isAckError, startServer, TestClient, type TestServer, waitUntil } from './helpers/server'

// every client → server event (pushes are the on* events)
const requestEvents = Object.values(Event).filter(event => !/^on[A-Z]/.test(event))
const lobbyEvents: string[] = [Event.GetGames, Event.GetGame, Event.SelectGame, Event.NewGame]

// sockets subscribed to the pushes of a game: each subscribed Controller adds one listener per game event
const subscribers = (game: Game): number =>
  (game as unknown as { _eventEmitter: EventEmitter })._eventEmitter.listenerCount(GameEvent.UpdatePlayers)

describe('socket API', () => {
  let server: TestServer
  let clients: TestClient[] = []

  const connect = async (auth?: Record<string, unknown>): Promise<TestClient> => {
    const client = new TestClient(server.base, auth)
    clients.push(client)
    return client.connected()
  }

  // a new game selected by every given socket
  const gameFor = async (...sockets: TestClient[]): Promise<string> => {
    const { gameId } = await sockets[0].request<ResponseNewGame>(Event.NewGame, { gameName: 'Тест' })
    for (const socket of sockets) {
      // eslint-disable-next-line no-await-in-loop
      expect(await socket.request(Event.SelectGame, { gameId })).toEqual({})
    }

    return gameId
  }

  const findGame = (gameId: string): Game => {
    const game = server.app.appState.findGame(gameId)
    if (!game) {
      throw new Error(`no game ${gameId}`)
    }

    return game
  }

  beforeAll(async () => {
    server = await startServer({
      prepare({ siqDir }) {
        writeZip(path.join(siqDir, 'test5.siq'), siq5Entries())
        writeZip(path.join(siqDir, 'test4.siq'), siq4Entries())
        fs.writeFileSync(path.join(siqDir, 'broken.siq'), 'not a zip')
        fs.writeFileSync(path.join(siqDir, 'readme.txt'), 'not a pack')
      },
    })
  })

  afterEach(() => {
    for (const client of clients) {
      client.close()
    }

    clients = []
  })

  afterAll(async () => {
    await server.close()
  })

  test('the server starts with one Default game', async () => {
    const client = await connect()
    const games = await client.request<ResponseGetGames>(Event.GetGames)
    expect(games).toContainEqual({ gameId: server.app.defaultGame.id, gameName: 'Default', packageName: null })
    const snapshot = await client.request<ResponseGetGame>(Event.GetGame, { gameId: server.app.defaultGame.id })
    expect(snapshot).toMatchObject({
      gameName: 'Default',
      packageName: null,
      players: [],
      progress: { roundIndex: 0, roundsCount: 0, questionsPlayed: 0, questionsTotal: 0 },
      screenData: { screen: Screen.Initial, payload: {} },
    })
  })

  test('every request is acknowledged, also without a selected game', async () => {
    const client = await connect()
    const responses = new Map<string, unknown>()
    for (const event of requestEvents) {
      // eslint-disable-next-line no-await-in-loop
      responses.set(event, await client.request(event, {}))
    }

    expect(Array.isArray(responses.get(Event.GetGames))).toBe(true)
    for (const event of [Event.GetGame, Event.SelectGame, Event.NewGame]) {
      expect(responses.get(event)).toMatchObject({ error: AckErrorCode.InvalidPayload })
    }

    for (const event of requestEvents.filter(item => !lobbyEvents.includes(item))) {
      const response = responses.get(event)
      expect(isAckError(response) && [AckErrorCode.GameNotSelected, AckErrorCode.InvalidPayload].includes(response.error)).toBe(true)
    }

    // requests without a payload are requests with {}
    for (const event of [Event.Next, Event.Exit, Event.GetPlayers, Event.AddPlayer, Event.GetSettings, Event.RepeatQuestion]) {
      expect(responses.get(event)).toEqual({ error: AckErrorCode.GameNotSelected, message: expect.any(String) as string })
      // eslint-disable-next-line no-await-in-loop
      expect(await client.request(event)).toEqual(responses.get(event))
    }
  })

  test('every request is acknowledged with a selected game', async () => {
    const client = await connect()
    await gameFor(client)
    const ordered = [...requestEvents.filter(event => event !== Event.Exit), Event.Exit]
    const responses = new Map<string, unknown>()
    for (const event of ordered) {
      // eslint-disable-next-line no-await-in-loop
      responses.set(event, await client.request(event, {}))
    }

    expect([...responses.keys()]).toEqual(ordered)
    expect(responses.get(Event.Next)).toEqual({})
    expect(responses.get(Event.AddPlayer)).toEqual({})
    // addPlayer comes before getPlayers in the enum
    expect(responses.get(Event.GetPlayers)).toEqual([expect.objectContaining({ name: '', queue: null })])
    expect(responses.get(Event.GetSettings)).toMatchObject({ big: 100, little: 20, scoreValue: 0 })
    expect(responses.get(Event.SelectPack)).toMatchObject({ error: AckErrorCode.InvalidPayload })
    expect(responses.get(Event.Exit)).toEqual({})
  })

  test('AckError codes: GAME_NOT_FOUND, GAME_NOT_SELECTED, INVALID_PAYLOAD, FAILED', async () => {
    const client = await connect()
    const notFound = { error: AckErrorCode.GameNotFound, message: expect.any(String) as string }
    expect(await client.request(Event.GetGame, { gameId: 'nope' })).toEqual(notFound)
    expect(await client.request(Event.SelectGame, { gameId: 'nope' })).toEqual(notFound)
    expect(await client.request(Event.Next)).toEqual({ error: AckErrorCode.GameNotSelected, message: expect.any(String) as string })

    await gameFor(client)
    // an unknown game keeps the current selection
    expect(await client.request(Event.SelectGame, { gameId: 'nope' })).toEqual(notFound)
    expect(await client.request(Event.GetPlayers)).toEqual([])

    const invalid: Array<[Event, unknown]> = [
      [Event.GetGame, { gameId: 5 }],
      [Event.GetGame, undefined],
      [Event.SetScoreValue, { value: 'abc' }],
      [Event.SetScorePlayer, { playerId: 'p', value: null }],
      [Event.SetVolumeSettings, { player: 101, admin: 0 }],
      [Event.SelectPack, { file: '../test5.siq' }],
      [Event.SelectPack, { file: path.join(server.siqDir, 'test5.siq') }],
      [Event.SelectPack, { file: 'readme.txt' }],
      [Event.NewGame, { gameName: 'x'.repeat(201) }],
      [Event.UpdatePlayer, { playerId: 'p' }],
      [Event.KeyPress, { code: 'KeyA' }],
      [Event.UpdateMediaPlayer, { time: -1, isPlaying: true }],
      [Event.Next, 'text'],
      [Event.Next, [1, 2]],
    ]
    for (const [event, payload] of invalid) {
      // eslint-disable-next-line no-await-in-loop
      const response = await client.ackError(event, payload)
      expect([event, response.error]).toEqual([event, AckErrorCode.InvalidPayload])
      expect(response.message).toMatch(/^Некорректные данные запроса: /)
    }

    // FAILED: a valid request that could not be done
    expect(await client.request(Event.SelectPack, { file: 'missing.siq' }))
      .toEqual({ error: AckErrorCode.Failed, message: expect.stringContaining('missing.siq') as string })
    expect(await client.request(Event.SelectQuestion, { questionId: 'nope' }))
      .toEqual({ error: AckErrorCode.Failed, message: 'Пак не выбран' })
    expect((await client.ackError(Event.SelectPack, { file: 'broken.siq' })).error).toBe(AckErrorCode.Failed)

    // the game is still usable after the failures
    expect(await client.request(Event.SelectPack, { file: 'test4.siq' })).toEqual({})
    expect(await client.request(Event.SelectQuestion, { questionId: 'nope' }))
      .toEqual({ error: AckErrorCode.Failed, message: 'Вопрос не найден в текущем раунде' })
  })

  test('a broken pack fails without changing the current game', async () => {
    const client = await connect()
    const gameId = await gameFor(client)
    await client.request(Event.SelectPack, { file: 'test4.siq' })
    await client.request(Event.Next)
    const before = await client.request<ResponseGetGame>(Event.GetGame, { gameId })

    const from = client.mark()
    expect((await client.ackError(Event.SelectPack, { file: 'broken.siq' })).error).toBe(AckErrorCode.Failed)
    expect(client.since(from)).toEqual([])
    expect(await client.request<ResponseGetGame>(Event.GetGame, { gameId })).toEqual(before)
  })

  test('emits without an ack callback are handled and keep the connection working', async () => {
    const client = await connect()
    await gameFor(client)
    jest.mocked(console.error).mockClear()

    client.socket.emit(Event.AddPlayer)
    client.socket.emit(Event.Next, { extra: true })
    client.socket.emit(Event.GetGame, { gameId: 5 })
    client.socket.emit('unknownEvent', {})

    expect(await client.request<Player[]>(Event.GetPlayers)).toHaveLength(1)
    expect(console.error).not.toHaveBeenCalled()
  })

  test('selectGame: the same game twice keeps one subscription; another game stops the pushes of the previous one', async () => {
    const a = await connect()
    const b = await connect()
    const first = await gameFor(a, b)
    const { gameId: second } = await a.request<ResponseNewGame>(Event.NewGame, { gameName: 'Вторая' })

    expect(await a.request(Event.SelectGame, { gameId: first })).toEqual({})
    let from = a.mark()
    await b.request(Event.AddPlayer)
    await a.sync()
    expect(a.since(from, Event.OnUpdatePlayers)).toHaveLength(1)
    expect(subscribers(findGame(first))).toBe(2)

    await a.request(Event.SelectGame, { gameId: second })
    from = a.mark()
    await b.request(Event.AddPlayer)
    await b.request(Event.SubmitScoreBigPlus)
    await b.request(Event.SelectPack, { file: 'test4.siq' })
    await a.sync()
    expect(a.since(from)).toEqual([])

    // requests and pushes now belong to the second game
    await a.request(Event.AddPlayer)
    expect(a.since(from, Event.OnUpdatePlayers)).toHaveLength(1)
    expect(await a.request<Player[]>(Event.GetPlayers)).toHaveLength(1)
    expect(await b.request<Player[]>(Event.GetPlayers)).toHaveLength(2)
    expect(subscribers(findGame(first))).toBe(1)
    expect(subscribers(findGame(second))).toBe(1)
  })

  test('a full game: pushes with progress, page indexes and results reach every socket of the game', async () => {
    const admin = await connect()
    const display = await connect()
    const gameId = await gameFor(admin, display)

    const next = async (): Promise<number> => {
      const from = admin.mark()
      expect(await admin.request(Event.Next)).toEqual({})
      return from
    }

    // next until the question is over (Table or Results)
    const finish = async (from: number): Promise<number> => {
      const isOver = () => admin.since(from, Event.OnStartTable).length > 0 || admin.since(from, Event.OnStartResults).length > 0
      for (let step = 0; step < 20 && !isOver(); step++) {
        // eslint-disable-next-line no-await-in-loop
        await admin.request(Event.Next)
      }

      expect(isOver()).toBe(true)
      return from
    }

    const play = async (questionId: string): Promise<number> => {
      const from = admin.mark()
      expect(await admin.request(Event.SelectQuestion, { questionId })).toEqual({})
      return finish(from)
    }

    // players
    let from = admin.mark()
    expect(await admin.request(Event.AddPlayer)).toEqual({})
    const added = admin.payloads<EventUpdatePlayers>(from, Event.OnUpdatePlayers)
    expect(added).toEqual([{ added: [expect.objectContaining({ queue: null, score: 0 })], removed: [], updated: [], currentSelector: null }])
    await admin.request(Event.AddPlayer)
    const [vasya, petya] = await display.request<Player[]>(Event.GetPlayers)
    await admin.request(Event.UpdatePlayer, { playerId: vasya.id, name: '  Вася ', keyboardKey: 'KeyA' })
    await admin.request(Event.UpdatePlayer, { playerId: petya.id, name: 'Петя', keyboardKey: 'KeyB' })

    // pack → Screensaver
    let displayFrom = display.mark()
    from = admin.mark()
    expect(await admin.request(Event.SelectPack, { file: 'test5.siq' })).toEqual({})
    expect(admin.payloads(from, Event.OnStartScreensaver)).toEqual([{ payload: {} }])
    expect(admin.payloads(from, Event.OnUpdateScoreValue)).toEqual([{ scoreValue: 0 }])
    await display.waitFor(Event.OnStartScreensaver, { from: displayFrom })

    // intro screens
    from = await next()
    expect(admin.payloads(from, Event.OnStartThemeList)).toEqual([{ payload: { themes: ['Тема 1', 'Тема 2', 'Тема 3', 'Ф1', 'Ф2', 'Ф3'] } }])
    from = await next()
    expect(admin.payloads(from, Event.OnStartRoundName))
      .toEqual([{ payload: { name: 'Раунд 1', progress: { roundIndex: 0, roundsCount: 2, questionsPlayed: 1, questionsTotal: 6 } } }])
    from = await next()
    expect(admin.payloads(from, Event.OnStartThemeListInRound)).toEqual([{ payload: { themes: ['Тема 1', 'Тема 2', 'Тема 3'] } }])

    // table
    displayFrom = display.mark()
    from = await next()
    const [table] = admin.payloads<EventStartTable>(from, Event.OnStartTable)
    expect(table.payload).toMatchObject({ type: RoundType.DEFAULT, currentSelector: null, progress: { roundIndex: 0, roundsCount: 2, questionsPlayed: 1, questionsTotal: 6 } })
    expect(table.payload.themes.map(theme => [theme.name, theme.questions.map(item => [item.price, item.isAvailable])])).toEqual([
      ['Тема 1', [[100, true], [200, true], [-1, false]]],
      ['Тема 2', [[300, true], [400, true]]],
      ['Тема 3', [[500, true]]],
    ])
    expect(await display.waitFor(Event.OnStartTable, { from: displayFrom })).toEqual(table)
    const ids = new Map(table.payload.themes.flatMap(theme => theme.questions).map(item => [item.price, item.id]))
    const id = (price: number): string => ids.get(price) ?? ''

    // question 100
    displayFrom = display.mark()
    from = admin.mark()
    await admin.request(Event.SelectQuestion, { questionId: id(100) })
    const [started] = admin.payloads<EventStartQuestion>(from, Event.OnStartQuestion)
    expect(started.payload).toEqual({
      id: id(100),
      comments: null,
      currentPage: page({ text: '007' }),
      nextPage: page({ image: 'pic 1.png' }),
      pageIndex: 0,
      pagesCount: 3,
      isAvailable: true,
      price: 100,
      rightAnswer: ['Бонд'],
      selectPrice: null,
      selectionMode: null,
      themeName: 'Тема 1',
      type: QuestionType.DEFAULT,
      wrongAnswer: null,
      currentSelector: null,
      answerGroup: [],
      answerType: QuestionAnswerType.DEFAULT,
    })
    expect(admin.payloads(from, Event.OnUpdateScoreValue)).toEqual([{ scoreValue: 100 }])
    expect(await display.waitFor(Event.OnStartQuestion, { from: displayFrom })).toEqual(started)

    // the player display sends the button press
    from = admin.mark()
    expect(await display.request(Event.KeyPress, { key: 'a', code: 'KeyA' })).toEqual({})
    const queued = await admin.waitFor<EventUpdatePlayers>(Event.OnUpdatePlayers, { from })
    expect(queued.updated.map(player => [player.name, player.queue])).toEqual([['Вася', 0], ['Петя', null]])

    from = await next()
    expect(admin.payloads(from, Event.OnUpdateQuestionPage))
      .toEqual([{ payload: { pageIndex: 1, pagesCount: 3, currentPage: page({ image: 'pic 1.png' }), nextPage: page({ isMarker: true, text: 'Бонд' }) } }])

    // right answer: score, selector and the answer page
    from = admin.mark()
    await admin.request(Event.WinPlayer, { playerId: vasya.id })
    const winPushes = admin.payloads<EventUpdatePlayers>(from, Event.OnUpdatePlayers)
    expect(winPushes.some(push => push.currentSelector === vasya.id && push.updated.some(player => player.id === vasya.id && player.score === 100 && player.win === 1)))
      .toBe(true)
    expect(admin.payloads<EventUpdateQuestionPage>(from, Event.OnUpdateQuestionPage).map(push => push.payload.pageIndex)).toEqual([2])

    from = await next()
    expect(admin.since(from, Event.OnStartTable)).toHaveLength(1)
    const [afterQuestion] = admin.payloads<EventStartTable>(from, Event.OnStartTable)
    expect(afterQuestion.payload.progress.questionsPlayed).toBe(2)
    expect(afterQuestion.payload.currentSelector).toBe(vasya.id)
    expect(afterQuestion.payload.themes[0].questions[0]).toEqual({ id: id(100), price: 100, isAvailable: false })

    // what a reloaded page gets
    expect(await display.request<ResponseGetGame>(Event.GetGame, { gameId })).toMatchObject({
      gameId,
      packageName: 'Тестовый пак',
      score: 100,
      progress: afterQuestion.payload.progress,
      screenData: { screen: Screen.Table, payload: afterQuestion.payload },
    })

    // stake: QuestionPreparation, the host sets the price and the player, buttons stay off
    from = admin.mark()
    await admin.request(Event.SelectQuestion, { questionId: id(200) })
    expect(admin.payloads<EventStartQuestion>(from, Event.onStartQuestionPreparation)[0].payload)
      .toMatchObject({ type: QuestionType.STAKE, selectPrice: { minimum: 100, maximum: 500, step: 100, type: 'step' } })
    await admin.request(Event.SetScoreValue, { value: 300 })
    await admin.request(Event.SelectPlayer, { playerId: petya.id })
    from = await next()
    expect(admin.payloads<EventStartQuestion>(from, Event.OnStartQuestion)[0].payload).toMatchObject({ type: QuestionType.STAKE, currentSelector: petya.id })
    from = admin.mark()
    await display.request(Event.KeyPress, { key: 'b', code: 'KeyB' })
    await admin.sync()
    expect(admin.since(from)).toEqual([])
    await finish(admin.mark())

    // answer group
    from = await play(id(300))
    expect(admin.payloads<EventStartQuestion>(from, Event.OnStartQuestion)[0].payload)
      .toMatchObject({ answerType: QuestionAnswerType.Group, answerGroup: [{ answer: 'Один', variant: 'A' }] })
    await play(id(400))

    // the last question of the round → Results instead of the Table
    displayFrom = display.mark()
    from = await play(id(500))
    expect(admin.since(from, Event.OnStartTable)).toEqual([])
    const [results] = admin.payloads<EventStartResults>(from, Event.OnStartResults)
    expect(results.payload.isLastRound).toBe(false)
    expect(results.payload.progress).toEqual({ roundIndex: 0, roundsCount: 2, questionsPlayed: 6, questionsTotal: 6 })
    expect(results.payload.players.map(player => [player.name, player.score])).toEqual([['Вася', 100], ['Петя', 0]])
    expect(await display.waitFor(Event.OnStartResults, { from: displayFrom })).toEqual(results)
    expect((await display.request<ResponseGetGame>(Event.GetGame, { gameId })).screenData).toEqual({ screen: Screen.Results, payload: results.payload })

    // final round
    from = await next()
    expect(admin.payloads(from, Event.OnStartRoundName))
      .toEqual([{ payload: { name: 'Финал', progress: { roundIndex: 1, roundsCount: 2, questionsPlayed: 0, questionsTotal: 3 } } }])
    await next()
    from = await next()
    const [finalTable] = admin.payloads<EventStartTable>(from, Event.OnStartTable)
    expect(finalTable.payload.type).toBe(RoundType.FINAL)
    const [f1, f2, f3] = finalTable.payload.themes.map(theme => theme.questions[0].id)

    for (const [questionId, played] of [[f1, 1], [f2, 2]] as const) {
      from = admin.mark()
      // eslint-disable-next-line no-await-in-loop
      await admin.request(Event.SelectQuestion, { questionId })
      expect(admin.since(from, Event.OnStartQuestion)).toEqual([])
      const eliminated = admin.payloads<EventStartTable>(from, Event.OnStartTable)
      expect(eliminated).toHaveLength(1)
      expect(eliminated[0].payload.progress.questionsPlayed).toBe(played)
    }

    from = admin.mark()
    await admin.request(Event.SelectQuestion, { questionId: f3 })
    expect(admin.payloads<EventStartQuestion>(from, Event.OnStartQuestion)[0].payload.currentPage).toEqual(page({ text: 'Ф3 вопрос' }))
    from = admin.mark()
    await display.request(Event.KeyPress, { key: 'b', code: 'KeyB' })
    const finalQueue = await admin.waitFor<EventUpdatePlayers>(Event.OnUpdatePlayers, { from })
    expect(finalQueue.updated.find(player => player.id === petya.id)?.queue).toBe(0)

    displayFrom = display.mark()
    from = await finish(admin.mark())
    const [finalResults] = admin.payloads<EventStartResults>(from, Event.OnStartResults)
    expect(finalResults.payload).toMatchObject({ isLastRound: true, progress: { roundIndex: 1, roundsCount: 2, questionsPlayed: 3, questionsTotal: 3 } })
    await display.waitFor(Event.OnStartResults, { from: displayFrom })

    // the end of the game: next and nextRound change nothing
    displayFrom = display.mark()
    from = admin.mark()
    expect(await admin.request(Event.Next)).toEqual({})
    expect(await admin.request(Event.NextRound)).toEqual({})
    await display.sync()
    expect(admin.since(from)).toEqual([])
    expect(display.since(displayFrom)).toEqual([])
    expect((await display.request<ResponseGetGame>(Event.GetGame, { gameId })).screenData.screen).toBe(Screen.Results)
  })

  test('score and settings requests push the score value and are read back', async () => {
    const admin = await connect()
    const display = await connect()
    await gameFor(admin, display)

    await admin.request(Event.SetScoreBig, { value: 500 })
    await admin.request(Event.SetScoreLittle, { value: 50 })
    const from = display.mark()
    await admin.request(Event.SubmitScoreBigPlus)
    await admin.request(Event.SubmitScoreLittlePlus)
    await admin.request(Event.SubmitScoreLittleMinus)
    await admin.request(Event.SubmitScoreBigMinus)
    await admin.request(Event.SetScoreValue, { value: 0 })
    await display.sync()
    expect(display.payloads<{ scoreValue: number }>(from, Event.OnUpdateScoreValue).map(push => push.scoreValue)).toEqual([500, 550, 500, 0, 0])

    await admin.request(Event.SetVolumeSettings, { player: 0, admin: 55 })
    expect(await display.request<ResponseGetSettings>(Event.GetSettings)).toEqual({ scoreValue: 0, big: 500, little: 50, playerVolume: 0, adminVolume: 55 })

    const mediaFrom = display.mark()
    await admin.request(Event.UpdateMediaPlayer, { time: 12.5, isPlaying: false })
    expect(await display.waitFor(Event.OnUpdateMediaPlayer, { from: mediaFrom })).toEqual({ time: 12.5, isPlaying: false })
  })

  test('exit: every socket of the game gets onExit and has no game any more; a new Default game replaces it', async () => {
    const admin = await connect()
    const display = await connect()
    const other = await connect()
    const gameId = await gameFor(admin, display)
    await gameFor(other)
    await admin.request(Event.SelectPack, { file: 'test4.siq' })
    const { packDir } = findGame(gameId)
    expect(path.dirname(path.dirname(packDir))).toBe(server.packagesDir)
    expect(fs.existsSync(path.join(packDir, 'Images', 'cat.png'))).toBe(true)
    const gamesBefore = await admin.request<ResponseGetGames>(Event.GetGames)

    const from = admin.mark()
    const displayFrom = display.mark()
    const otherFrom = other.mark()
    expect(await admin.request(Event.Exit)).toEqual({})
    expect(admin.payloads(from, Event.OnExit)).toEqual([{}])
    expect(await display.waitFor(Event.OnExit, { from: displayFrom })).toEqual({})

    for (const client of [admin, display]) {
      // eslint-disable-next-line no-await-in-loop
      expect((await client.ackError(Event.Next)).error).toBe(AckErrorCode.GameNotSelected)
    }

    expect((await admin.ackError(Event.GetGame, { gameId })).error).toBe(AckErrorCode.GameNotFound)
    expect((await admin.ackError(Event.SelectGame, { gameId })).error).toBe(AckErrorCode.GameNotFound)
    const gamesAfter = await admin.request<ResponseGetGames>(Event.GetGames)
    expect(gamesAfter.some(game => game.gameId === gameId)).toBe(false)
    expect(gamesAfter.filter(game => !gamesBefore.some(before => before.gameId === game.gameId)))
      .toEqual([{ gameId: expect.any(String) as string, gameName: 'Default', packageName: null }])
    // the media are removed in the background
    await waitUntil(() => !fs.existsSync(packDir), 'the media of the closed game are removed')

    // other games go on
    await other.sync()
    expect(other.since(otherFrom, Event.OnExit)).toEqual([])
    expect(await other.request(Event.GetPlayers)).toEqual([])
  })

  test('exit when the media cannot be removed: no closed game is left, the new Default game works', async () => {
    const admin = await connect()
    const gameId = await gameFor(admin)
    await admin.request(Event.SelectPack, { file: 'test4.siq' })
    const { packDir } = findGame(gameId)
    const gamesBefore = await admin.request<ResponseGetGames>(Event.GetGames)
    // Windows: a freshly extracted file held by an antivirus; rm gives up after its retries
    const rm = jest.spyOn(fs.promises, 'rm').mockImplementation(async target => {
      throw Object.assign(new Error(`EBUSY: resource busy or locked, rm '${String(target)}'`), { code: 'EBUSY' })
    })
    try {
      expect(await admin.request(Event.Exit)).toEqual({})
      await waitUntil(() => rm.mock.calls.some(([target]) => target === packDir), 'the media removal is tried')
    } finally {
      rm.mockRestore()
    }

    const games = await admin.request<ResponseGetGames>(Event.GetGames)
    expect(games.some(game => game.gameId === gameId)).toBe(false)
    expect((await admin.ackError(Event.SelectGame, { gameId })).error).toBe(AckErrorCode.GameNotFound)
    expect(fs.existsSync(packDir)).toBe(true) // removed at a later start

    const created = games.filter(game => !gamesBefore.some(before => before.gameId === game.gameId))
    expect(created).toEqual([expect.objectContaining({ gameName: 'Default' })])
    expect(await admin.request(Event.SelectGame, { gameId: created[0].gameId })).toEqual({})
    expect(await admin.request(Event.AddPlayer)).toEqual({})
    expect(await admin.request(Event.SelectPack, { file: 'test4.siq' })).toEqual({})
    expect(await admin.request<Player[]>(Event.GetPlayers)).toHaveLength(1)
  })

  test('reconnect: a new connection selects the game again and gets its state and pushes', async () => {
    const admin = await connect()
    const gameId = await gameFor(admin)
    await admin.request(Event.AddPlayer)
    await admin.request(Event.SelectPack, { file: 'test4.siq' })
    await admin.request(Event.Next)
    const game = findGame(gameId)

    const display = await connect()
    await display.request(Event.SelectGame, { gameId })
    expect(subscribers(game)).toBe(2)

    // the connection drops (Wi-Fi, sleep, server restart ...): the server forgets its subscription
    display.close()
    await waitUntil(() => subscribers(game) === 1, 'the closed socket is unsubscribed')

    const again = await connect()
    expect((await again.ackError(Event.Next)).error).toBe(AckErrorCode.GameNotSelected)
    expect(await again.request(Event.SelectGame, { gameId })).toEqual({})
    const snapshot = await again.request<ResponseGetGame>(Event.GetGame, { gameId })
    expect(snapshot.screenData.screen).toBe(Screen.ThemeList)
    expect(snapshot.players).toHaveLength(1)

    const from = again.mark()
    await admin.request(Event.Next)
    expect(await again.waitFor(Event.OnStartRoundName, { from })).toMatchObject({ payload: { name: 'Р1' } })
    expect(subscribers(game)).toBe(2)
  })

  test('two selectPack at once: one loads the pack, the other fails cleanly', async () => {
    const admin = await connect()
    const gameId = await gameFor(admin)
    const responses = await Promise.all([
      admin.request(Event.SelectPack, { file: 'test5.siq' }),
      admin.request(Event.SelectPack, { file: 'test4.siq' }),
    ])
    expect(responses.filter(response => isAckError(response) && response.error === AckErrorCode.Failed)).toHaveLength(1)
    expect(responses.filter(response => !isAckError(response))).toEqual([{}])
    expect((await admin.request<ResponseGetGame>(Event.GetGame, { gameId })).screenData.screen).toBe(Screen.Screensaver)
  })

  test('removePlayer pushes the removal and the new queue positions', async () => {
    const admin = await connect()
    const gameId = await gameFor(admin)
    await admin.request(Event.AddPlayer)
    await admin.request(Event.AddPlayer)
    const [vasya, petya] = await admin.request<Player[]>(Event.GetPlayers)
    await admin.request(Event.UpdatePlayer, { playerId: vasya.id, name: 'Вася', keyboardKey: 'KeyA' })
    await admin.request(Event.UpdatePlayer, { playerId: petya.id, name: 'Петя', keyboardKey: 'KeyB' })
    await admin.request(Event.SelectPack, { file: 'test5.siq' })
    for (let step = 0; step < 4; step++) {
      // eslint-disable-next-line no-await-in-loop
      await admin.request(Event.Next)
    }

    const snapshot = await admin.request<ResponseGetGame>(Event.GetGame, { gameId })
    const table = snapshot.screenData.screen === Screen.Table ? snapshot.screenData.payload : null
    await admin.request(Event.SelectQuestion, { questionId: table?.themes[0].questions[0].id })
    await admin.request(Event.KeyPress, { key: 'a', code: 'KeyA' })
    await admin.request(Event.KeyPress, { key: 'b', code: 'KeyB' })

    const from = admin.mark()
    await admin.request(Event.RemovePlayer, { playerId: vasya.id })
    const pushes = admin.payloads<EventUpdatePlayers>(from, Event.OnUpdatePlayers)
    expect(pushes).toContainEqual({ added: [], removed: [vasya.id], updated: [], currentSelector: null })
    expect(pushes).toContainEqual(expect.objectContaining({ updated: [expect.objectContaining({ id: petya.id, queue: 0 })] }))
    expect(await admin.request<Player[]>(Event.GetPlayers)).toEqual([expect.objectContaining({ id: petya.id, queue: 0 })])
  })

  // The client merges a pushed player over its copy (si-game-admin-2/src/store/players.ts mergePlayers): a push with
  // `queue: null` would erase the queue mark of a queued player on any score / name / win change.
  test('player update pushes keep the queue position of the player', async () => {
    const admin = await connect()
    const gameId = await gameFor(admin)
    await admin.request(Event.AddPlayer)
    const [vasya] = await admin.request<Player[]>(Event.GetPlayers)
    await admin.request(Event.UpdatePlayer, { playerId: vasya.id, name: 'Вася', keyboardKey: 'KeyA' })
    await admin.request(Event.SelectPack, { file: 'test5.siq' })
    for (let step = 0; step < 4; step++) {
      // eslint-disable-next-line no-await-in-loop
      await admin.request(Event.Next)
    }

    const snapshot = await admin.request<ResponseGetGame>(Event.GetGame, { gameId })
    const table = snapshot.screenData.screen === Screen.Table ? snapshot.screenData.payload : null
    await admin.request(Event.SelectQuestion, { questionId: table?.themes[0].questions[0].id })
    await admin.request(Event.KeyPress, { key: 'a', code: 'KeyA' })
    expect(await admin.request<Player[]>(Event.GetPlayers)).toEqual([expect.objectContaining({ id: vasya.id, queue: 0 })])

    const from = admin.mark()
    await admin.request(Event.SetScorePlayer, { playerId: vasya.id, value: 50 })
    const pushes = admin.payloads<EventUpdatePlayers>(from, Event.OnUpdatePlayers)
    expect(pushes).toEqual([expect.objectContaining({ updated: [expect.objectContaining({ id: vasya.id, score: 50, queue: 0 })] })])
  })

  test('the payload of an AckError is never mistaken for data', async () => {
    const client = await connect()
    const error: AckError = await client.ackError(Event.GetPlayers)
    expect(Object.keys(error).sort()).toEqual(['error', 'message'])
  })
})
