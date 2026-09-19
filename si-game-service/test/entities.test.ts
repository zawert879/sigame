import EventEmitter from 'eventemitter3'
import fs from 'fs'
import path from 'path'
import { AppState } from '../src/entity/AppState'
import { MediaPlayer } from '../src/entity/MediaPlayer'
import { Player } from '../src/entity/Player'
import { QueuePlayers } from '../src/entity/QueuePlayers'
import { Score } from '../src/entity/Score'
import { GameEvent } from '../src/events'
import { makeTempDir, siq4Entries, writeZip } from './helpers/fixtures'

function container() {
  const eventEmitter = new EventEmitter()
  const events: Array<[GameEvent, unknown]> = []
  for (const event of Object.values(GameEvent)) {
    eventEmitter.on(event, (payload: unknown) => {
      events.push([event, payload])
    })
  }

  return { gameContainer: { id: 'game', eventEmitter }, eventEmitter, events }
}

describe('MediaPlayer', () => {
  test('starts at 0 and playing', () => {
    const { eventEmitter } = container()
    const player = new MediaPlayer(eventEmitter)
    expect([player.time, player.isPlaying]).toEqual([0, true])
  })

  test('reset: nothing to do when already playing at 0', () => {
    const { eventEmitter, events } = container()
    new MediaPlayer(eventEmitter).reset()
    expect(events).toEqual([])
  })

  test('reset resumes media paused at 0 (B14)', () => {
    const { eventEmitter, events } = container()
    const player = new MediaPlayer(eventEmitter)
    player.update(0, false)
    events.length = 0
    player.reset()
    expect(player.isPlaying).toBe(true)
    expect(events).toEqual([[GameEvent.UpdateMediaPlayer, { time: 0, isPlaying: true }]])
  })

  test('reset rewinds playing media', () => {
    const { eventEmitter, events } = container()
    const player = new MediaPlayer(eventEmitter)
    player.update(12.5, true)
    events.length = 0
    player.reset()
    expect(player.time).toBe(0)
    expect(events).toEqual([[GameEvent.UpdateMediaPlayer, { time: 0, isPlaying: true }]])
  })

  test('reset(true) always emits (clients may have moved on without reporting it)', () => {
    const { eventEmitter, events } = container()
    new MediaPlayer(eventEmitter).reset(true)
    expect(events).toEqual([[GameEvent.UpdateMediaPlayer, { time: 0, isPlaying: true }]])
  })

  test('state moves the position forward while playing and holds it while paused', () => {
    const { eventEmitter } = container()
    let now = 1000
    const player = new MediaPlayer(eventEmitter, () => now)
    player.update(10, true)
    now += 2500
    expect(player.state).toEqual({ time: 12.5, isPlaying: true })

    player.update(4, false)
    now += 60000
    expect(player.state).toEqual({ time: 4, isPlaying: false })

    player.reset(true)
    now += 1500
    expect(player.state).toEqual({ time: 1.5, isPlaying: true })
  })

  test('update and the setters emit the whole state', () => {
    const { eventEmitter, events } = container()
    const player = new MediaPlayer(eventEmitter)
    player.update(3, false)
    player.time = 5
    player.isPlaying = true
    expect(events).toEqual([
      [GameEvent.UpdateMediaPlayer, { time: 3, isPlaying: false }],
      [GameEvent.UpdateMediaPlayer, { time: 5, isPlaying: false }],
      [GameEvent.UpdateMediaPlayer, { time: 5, isPlaying: true }],
    ])
  })
})

describe('QueuePlayers', () => {
  test('keeps the order of the first press, emits only on changes', () => {
    const { gameContainer, events } = container()
    const queue = new QueuePlayers(gameContainer)
    const [a, b, c] = [new Player(), new Player(), new Player()]

    queue.clear()
    expect(events).toEqual([])

    queue.addPlayer(a)
    queue.addPlayer(b)
    queue.addPlayer(a)
    queue.addPlayer(c)
    expect(queue.queue).toEqual([a.id, b.id, c.id])
    expect([queue.getPlayer(a.id), queue.getPlayer(c.id), queue.getPlayer('nope')]).toEqual([0, 2, null])
    expect(events.filter(([event]) => event === GameEvent.QueuePlayersUpdated)).toHaveLength(3)

    queue.removePlayer(b.id)
    queue.removePlayer('nope')
    expect(queue.queue).toEqual([a.id, c.id])
    expect(queue.getPlayer(c.id)).toBe(1)

    queue.queue.push('x')
    expect(queue.queue).toEqual([a.id, c.id])

    events.length = 0
    queue.clear()
    expect(queue.queue).toEqual([])
    expect(events).toEqual([[GameEvent.QueuePlayersUpdated, undefined]])
  })
})

describe('Score', () => {
  test('little / big steps and setValue emit the new value', () => {
    const { gameContainer, events } = container()
    const score = new Score(gameContainer)
    expect([score.value, score.little, score.big]).toEqual([0, 20, 100])

    score.bigPlus()
    score.littlePlus()
    score.littleMinus()
    score.setLittle(5)
    score.setBig(1000)
    score.bigMinus()
    score.littlePlus()
    expect(score.value).toBe(-895)
    expect(events.map(([, value]) => value)).toEqual([100, 120, 100, -900, -895])
    expect(events.every(([event]) => event === GameEvent.UpdateScoreValue)).toBe(true)

    score.setValue(0)
    expect(score.value).toBe(0)
  })
})

describe('Player', () => {
  test('win / lose and the setters report every change to the listener (the game pushes it)', () => {
    const changes: Array<[string, number, number, number]> = []
    const player = new Player(changed => {
      changes.push([changed.name, changed.score, changed.winCount, changed.loseCount])
    })
    player.setName('Вася')
    player.setKeyboardKey('KeyA')
    player.win(100)
    player.lose(30)
    player.setScore(500)
    player.setWin(3)
    player.setLose(4)

    expect([player.name, player.keyboardKey, player.score, player.winCount, player.loseCount]).toEqual(['Вася', 'KeyA', 500, 3, 4])
    expect(changes).toEqual([
      ['Вася', 0, 0, 0],
      ['Вася', 0, 0, 0],
      ['Вася', 100, 1, 0],
      ['Вася', 70, 1, 1],
      ['Вася', 500, 1, 1],
      ['Вася', 500, 3, 1],
      ['Вася', 500, 3, 4],
    ])
  })

  test('every player gets its own id', () => {
    expect(new Player().id).not.toBe(new Player().id)
  })
})

describe('AppState', () => {
  test('newGame / findGame / closeGame', async () => {
    const appState = new AppState()
    const first = appState.newGame('Первая')
    const second = appState.newGame('Вторая')
    expect(appState.games).toEqual([first, second])
    expect(appState.findGame(first.id)).toBe(first)
    expect(appState.findGame('nope')).toBeNull()

    await first.loadPack(writeZip(path.join(makeTempDir('app-'), 'p.siq'), siq4Entries()))
    expect(fs.existsSync(first.packDir)).toBe(true)
    const onExit = jest.fn()
    first.on(GameEvent.Exit, onExit)

    const closing = appState.closeGame(first.id)
    expect(appState.games).toEqual([second])
    await closing
    await appState.closeGame(first.id)
    await appState.closeGame('nope')

    expect(onExit).toHaveBeenCalledTimes(1)
    expect(first.isClosed).toBe(true)
    expect(fs.existsSync(first.packDir)).toBe(false)
    expect(appState.games).toEqual([second])
    expect(appState.findGame(first.id)).toBeNull()
  })

  test('closeGame: media that cannot be removed leave no closed game behind', async () => {
    const appState = new AppState()
    const game = appState.newGame('Первая')
    await game.loadPack(writeZip(path.join(makeTempDir('app-'), 'p.siq'), siq4Entries()))
    const rm = jest.spyOn(fs.promises, 'rm').mockRejectedValueOnce(Object.assign(new Error('EBUSY: resource busy or locked'), { code: 'EBUSY' }))
    try {
      await expect(appState.closeGame(game.id)).resolves.toBeUndefined()
      expect(rm).toHaveBeenCalledWith(game.packDir, expect.objectContaining({ recursive: true, maxRetries: 5 }))
    } finally {
      rm.mockRestore()
    }

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(game.packDir), 'EBUSY: resource busy or locked')
    expect(game.isClosed).toBe(true)
    expect(appState.games).toEqual([])
    expect(appState.findGame(game.id)).toBeNull()
    expect(fs.existsSync(game.packDir)).toBe(true)
  })

  test('a game closed on its own is not listed or found', () => {
    const appState = new AppState()
    const game = appState.newGame('Первая')
    game.closeGame()
    expect(appState.games).toEqual([])
    expect(appState.findGame(game.id)).toBeNull()
  })
})
