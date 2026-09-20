import fs from 'fs'
import path from 'path'
import { QuestionType, RoundType, Screen } from '../src/data'
import { Game, type GameListeners } from '../src/entity/Game'
import { GameError } from '../src/entity/GameError'
import type { Player } from '../src/entity/Player'
import type { Question } from '../src/entity/Question'
import { GameEvent } from '../src/events'
import type { EventUpdatePlayers } from '../src/types'
import { mediaDir } from '../src/utils/packages'
import { listFiles, makeTempDir, maliciousEntries, noContentEntries, packageXml, siq4Entries, siq5Entries, writeZip } from './helpers/fixtures'

type Recorded = {
  event: GameEvent;
  args: unknown[];
}

function record(game: Game) {
  const events: Recorded[] = []
  const listeners = Object.fromEntries(Object.values(GameEvent).map(event => [event, (...args: unknown[]) => {
    events.push({ event, args })
  }])) as GameListeners
  game.subscribe(listeners)
  return {
    events,
    names: () => events.map(item => item.event),
    clear() {
      events.length = 0
    },
    of: (event: GameEvent) => events.filter(item => item.event === event).map(item => item.args),
  }
}

let siq5: string
let siq4: string
let broken: string
let noContent: string
let evil: string

beforeAll(() => {
  const dir = makeTempDir('packs-')
  siq5 = writeZip(path.join(dir, 'test5.siq'), siq5Entries())
  siq4 = writeZip(path.join(dir, 'test4.siq'), siq4Entries())
  noContent = writeZip(path.join(dir, 'nocontent.siq'), noContentEntries())
  evil = writeZip(path.join(dir, 'evil.siq'), maliciousEntries(path.join(dir, 'absolute-escape.txt')))
  broken = path.join(dir, 'broken.siq')
  fs.writeFileSync(broken, 'not a zip')
})

const games: Game[] = []
const newGame = (): Game => {
  const game = new Game('Тест')
  games.push(game)
  return game
}

afterAll(() => {
  for (const game of games) {
    game.closeGame()
  }
})

const question = (game: Game, price: number): Question => {
  const found = game.package?.currentRound.questions.find(item => item.price === price)
  if (!found) {
    throw new Error(`no question ${price} in the current round`)
  }

  return found
}

const finalQuestion = (game: Game, themeName: string): Question => {
  const found = game.package?.currentRound.themes.find(theme => theme.name === themeName)?.questions[0]
  if (!found) {
    throw new Error(`no final theme ${themeName}`)
  }

  return found
}

async function tableGame(file = siq5): Promise<Game> {
  const game = newGame()
  await game.loadPack(file)
  for (let step = 0; step < 4; step++) {
    game.next()
  }

  expect(game.screen).toBe(Screen.Table)
  return game
}

function play(game: Game, target: Question) {
  game.selectQuestion(target.id)
  for (let step = 0; step < 20 && (game.screen === Screen.QuestionPreparation || game.screen === Screen.Question); step++) {
    game.next()
  }

  expect([Screen.Table, Screen.Results]).toContain(game.screen)
}

function playRound(game: Game) {
  for (const target of game.package!.currentRound.questions.filter(item => item.isAvailable)) {
    play(game, target)
  }
}

function addPlayer(game: Game, name: string, key: string): Player {
  const player = game.addPlayer()
  game.updatePlayer(player.id, name, key)
  return player
}

describe('Game: screens', () => {
  test('a new game waits on Initial; next does nothing', () => {
    const game = newGame()
    const recorder = record(game)
    game.next()
    expect(game.screen).toBe(Screen.Initial)
    expect(recorder.events).toEqual([])
    expect(game.package).toBeNull()
    expect(game.packageName).toBeNull()
    expect(game.progress).toEqual({ roundIndex: 0, roundsCount: 0, questionsPlayed: 0, questionsTotal: 0 })
  })

  test('loadPack extracts the media and only then shows the Screensaver', async () => {
    const game = newGame()
    const recorder = record(game)
    const seen: string[][] = []
    game.on(GameEvent.StartScreensaver, () => {
      seen.push(listFiles(game.packDir))
    })

    await game.loadPack(siq5)

    expect(game.screen).toBe(Screen.Screensaver)
    expect(game.packageName).toBe('Тестовый пак')
    expect(recorder.of(GameEvent.StartScreensaver)).toHaveLength(1)
    expect(seen).toEqual([['Audio/song.mp3', 'Images/answer.png', 'Images/b.png', 'Images/pic 1.png', 'Video/clip.mp4']])
    expect(game.packDir).toBe(path.join(mediaDir, game.id))
    expect(path.dirname(mediaDir)).toBe(process.env.PACKAGES_DIR)
    expect(path.basename(mediaDir)).toMatch(new RegExp(`^run-${process.pid}-[\\da-f-]{36}$`))
  })

  test('next walks Screensaver → ThemeList → RoundName → ThemeListInRound → Table; Table waits for a question', async () => {
    const game = newGame()
    await game.loadPack(siq5)
    const recorder = record(game)
    const screens: Screen[] = []
    for (let step = 0; step < 5; step++) {
      game.next()
      screens.push(game.screen)
    }

    expect(screens).toEqual([Screen.ThemeList, Screen.RoundName, Screen.ThemeListInRound, Screen.Table, Screen.Table])
    expect(recorder.names()).toEqual([
      GameEvent.StartThemeList,
      GameEvent.StartRoundName,
      GameEvent.StartThemeListInRound,
      GameEvent.StartTable,
    ])
  })

  test('default question: Question → pages → Table', async () => {
    const game = await tableGame()
    const recorder = record(game)
    const q100 = question(game, 100)

    game.selectQuestion(q100.id)
    expect(game.screen).toBe(Screen.Question)
    expect(game.package?.currentQuestion).toBe(q100)
    expect(game.score.value).toBe(100)
    expect(game.isButtonsActive).toBe(true)
    expect(recorder.names()).toEqual([GameEvent.UpdateScoreValue, GameEvent.StartQuestion, GameEvent.UpdateMediaPlayer])

    recorder.clear()
    game.next()
    expect(q100.pageIndex).toBe(1)
    game.next()
    expect(q100.pageIndex).toBe(2)
    expect(q100.currentPage?.isMarker).toBe(true)
    expect(recorder.names()).toEqual([GameEvent.UpdatePage, GameEvent.UpdateMediaPlayer, GameEvent.UpdatePage, GameEvent.UpdateMediaPlayer])
    expect(recorder.of(GameEvent.UpdateMediaPlayer)).toEqual([[{ time: 0, isPlaying: true }], [{ time: 0, isPlaying: true }]])

    recorder.clear()
    game.next()
    expect(game.screen).toBe(Screen.Table)
    expect(q100.isAvailable).toBe(false)
    expect(q100.pageIndex).toBe(0)
    expect(game.package?.currentQuestion).toBeNull()
    expect(game.isButtonsActive).toBe(false)
    expect(recorder.names()).toEqual([GameEvent.StartTable])
  })

  test('special question: QuestionPreparation first, buttons stay off, the host sets the price', async () => {
    const game = await tableGame()
    game.score.setValue(777)
    const recorder = record(game)
    const stake = question(game, 200)

    game.selectQuestion(stake.id)
    expect(game.screen).toBe(Screen.QuestionPreparation)
    expect(game.package?.currentQuestion).toBe(stake)
    expect(game.isButtonsActive).toBe(false)
    expect(game.score.value).toBe(200)
    expect(recorder.names()).toEqual([GameEvent.UpdateScoreValue, GameEvent.StartQuestionPreparation])

    recorder.clear()
    game.next()
    expect(game.screen).toBe(Screen.Question)
    expect(game.isButtonsActive).toBe(false)
    expect(recorder.names()).toEqual([GameEvent.StartQuestion, GameEvent.UpdateMediaPlayer])

    game.next()
    game.next()
    expect(game.screen).toBe(Screen.Table)
    expect(stake.isAvailable).toBe(false)
  })

  test('a special question starts from its own price, not from the previous one', async () => {
    const game = await tableGame()
    game.score.setValue(777)

    game.selectQuestion(question(game, 400).id)
    expect(game.screen).toBe(Screen.QuestionPreparation)
    expect(game.score.value).toBe(400)

    game.cancelQuestion()
    game.score.setValue(777)
    game.selectQuestion(question(game, 500).id)
    expect(game.score.value).toBe(500)
  })

  test.each([
    [300, QuestionType.DEFAULT, Screen.Question],
    [400, QuestionType.SECRET, Screen.QuestionPreparation],
    [500, QuestionType.NO_RISC, Screen.QuestionPreparation],
  ])('question %i (%s) opens %s', async (price, type, screen) => {
    const game = await tableGame()
    const target = question(game, price)
    expect(target.type).toBe(type)
    game.selectQuestion(target.id)
    expect(game.screen).toBe(screen)
  })

  test('selectQuestion ignores played questions and screens other than Table', async () => {
    const game = await tableGame()
    const recorder = record(game)

    game.selectQuestion(question(game, -1).id)
    expect(game.screen).toBe(Screen.Table)
    expect(recorder.events).toEqual([])

    game.selectQuestion(question(game, 100).id)
    recorder.clear()
    game.selectQuestion(question(game, 300).id)
    expect(game.package?.currentQuestion).toBe(question(game, 100))
    expect(recorder.events).toEqual([])
  })

  test('selectQuestion throws a GameError without a pack or for an unknown question', async () => {
    expect(() => {
      newGame().selectQuestion('nope')
    }).toThrow(GameError)

    const game = await tableGame()
    expect(() => {
      game.selectQuestion('nope')
    }).toThrow(GameError)

    game.nextRound()
    const firstRoundQuestion = game.package!.rounds[0].questions[0]
    expect(() => {
      game.selectQuestion(firstRoundQuestion.id)
    }).toThrow(GameError)
  })

  test('the last question of a round shows Results, next goes to the RoundName of the next round', async () => {
    const game = await tableGame()
    playRound(game)
    const recorder = record(game)
    expect(game.screen).toBe(Screen.Results)
    expect(game.package?.isLastRound).toBe(false)
    expect(game.progress).toEqual({ roundIndex: 0, roundsCount: 2, questionsPlayed: 6, questionsTotal: 6 })

    game.next()
    expect(game.screen).toBe(Screen.RoundName)
    expect(game.package?.currentRound.name).toBe('Финал')
    expect(game.progress).toEqual({ roundIndex: 1, roundsCount: 2, questionsPlayed: 0, questionsTotal: 3 })
    expect(recorder.names()).toEqual([GameEvent.StartRoundName])
  })

  test('a round ends with StartResults, not StartTable', async () => {
    const game = await tableGame()
    const remaining = game.package!.currentRound.questions.filter(item => item.isAvailable)
    for (const target of remaining.slice(0, -1)) {
      play(game, target)
    }

    const recorder = record(game)
    play(game, remaining[remaining.length - 1])
    expect(recorder.names()).toContain(GameEvent.StartResults)
    expect(recorder.names()).not.toContain(GameEvent.StartTable)
  })

  test('final round: themes are removed one by one, the last one is played as a question', async () => {
    const game = await tableGame()
    playRound(game)
    game.next()
    game.next()
    game.next()
    expect(game.screen).toBe(Screen.Table)
    expect(game.package?.currentRound.type).toBe(RoundType.FINAL)
    addPlayer(game, 'Вася', 'KeyA')

    const recorder = record(game)
    const f1 = finalQuestion(game, 'Ф1')
    game.selectQuestion(f1.id)
    expect(game.screen).toBe(Screen.Table)
    expect(f1.isAvailable).toBe(false)
    expect(recorder.names()).toEqual([GameEvent.StartTable])
    expect(game.progress.questionsPlayed).toBe(1)

    recorder.clear()
    game.selectQuestion(f1.id)
    expect(recorder.events).toEqual([])

    game.selectQuestion(finalQuestion(game, 'Ф2').id)
    expect(game.screen).toBe(Screen.Table)

    recorder.clear()
    const f3 = finalQuestion(game, 'Ф3')
    game.selectQuestion(f3.id)
    expect(game.screen).toBe(Screen.Question)
    expect(game.package?.currentQuestion).toBe(f3)
    expect(game.score.value).toBe(0)
    expect(recorder.names()).toContain(GameEvent.StartQuestion)
    expect(game.isButtonsActive).toBe(true)
    game.playerUsedButton('KeyA')
    expect(game.queuePlayersIds).toHaveLength(1)

    game.next()
    game.next()
    expect(game.screen).toBe(Screen.Results)
    expect(game.package?.isLastRound).toBe(true)
    expect(game.getResultsPayload().isLastRound).toBe(true)
    expect(game.progress).toEqual({ roundIndex: 1, roundsCount: 2, questionsPlayed: 3, questionsTotal: 3 })

    recorder.clear()
    game.next()
    expect(() => {
      game.nextRound()
    }).toThrow(new GameError('Это последний раунд'))
    expect(game.screen).toBe(Screen.Results)
    expect(recorder.events).toEqual([])
  })

  test('a finished round goes straight from ThemeListInRound to Results', async () => {
    const game = await tableGame()
    playRound(game)
    game.next()
    game.previousRound()
    expect(game.screen).toBe(Screen.RoundName)
    expect(game.package?.roundIndex).toBe(0)
    game.next()
    expect(game.screen).toBe(Screen.ThemeListInRound)
    game.next()
    expect(game.screen).toBe(Screen.Results)
  })

  test('nextRound / previousRound switch rounds from any screen', async () => {
    const game = await tableGame()
    game.selectQuestion(question(game, 100).id)
    const recorder = record(game)

    game.nextRound()
    expect(game.screen).toBe(Screen.RoundName)
    expect(game.package?.roundIndex).toBe(1)
    expect(game.package?.currentQuestion).toBeNull()
    expect(game.isButtonsActive).toBe(false)
    expect(recorder.names()).toEqual([GameEvent.StartRoundName])

    recorder.clear()
    expect(() => {
      game.nextRound()
    }).toThrow(new GameError('Это последний раунд'))
    expect(game.package?.roundIndex).toBe(1)
    expect(recorder.events).toEqual([])

    game.previousRound()
    expect(game.package?.roundIndex).toBe(0)
    expect(game.screen).toBe(Screen.RoundName)

    recorder.clear()
    expect(() => {
      game.previousRound()
    }).toThrow(new GameError('Это первый раунд'))
    expect(game.package?.roundIndex).toBe(0)
    expect(recorder.events).toEqual([])

    expect(question(game, 100).isAvailable).toBe(true)
  })

  test('nextRound / previousRound without a pack throw a GameError', () => {
    const game = newGame()
    expect(() => {
      game.nextRound()
    }).toThrow(new GameError('Пак не выбран'))
    expect(() => {
      game.previousRound()
    }).toThrow(new GameError('Пак не выбран'))
  })

  test('progress counts the played questions of the current round (a negative price counts as played)', async () => {
    const game = await tableGame()
    expect(game.progress).toEqual({ roundIndex: 0, roundsCount: 2, questionsPlayed: 1, questionsTotal: 6 })
    play(game, question(game, 100))
    expect(game.progress.questionsPlayed).toBe(2)
    play(game, question(game, 200))
    expect(game.progress.questionsPlayed).toBe(3)
    expect(game.getTablePayload().progress).toEqual(game.progress)
  })
})

describe('Game: question controls', () => {
  test('repeatQuestion starts the question again: first page, empty queue, forced media reset, buttons on', async () => {
    const game = await tableGame()
    addPlayer(game, 'Вася', 'KeyA')
    const q100 = question(game, 100)
    game.selectQuestion(q100.id)
    game.playerUsedButton('KeyA')
    game.next()
    game.next()
    game.winPlayer(game.players[0].id)
    const recorder = record(game)

    game.repeatQuestion()

    expect(game.screen).toBe(Screen.Question)
    expect(q100.pageIndex).toBe(0)
    expect(q100.isAvailable).toBe(true)
    expect(game.queuePlayersIds).toEqual([])
    expect(game.isButtonsActive).toBe(true)
    expect(recorder.of(GameEvent.UpdateMediaPlayer)).toEqual([[{ time: 0, isPlaying: true }]])
    expect(recorder.names()).toEqual([GameEvent.UpdatePage, GameEvent.UpdateMediaPlayer])
  })

  test('repeatQuestion keeps the buttons off for a special question', async () => {
    const game = await tableGame()
    game.selectQuestion(question(game, 200).id)
    game.next()
    game.repeatQuestion()
    expect(game.screen).toBe(Screen.Question)
    expect(game.isButtonsActive).toBe(false)
  })

  test('repeatQuestion outside a question does nothing', async () => {
    const game = await tableGame()
    const recorder = record(game)
    game.repeatQuestion()
    game.selectQuestion(question(game, 200).id)
    recorder.clear()
    game.repeatQuestion()
    expect(recorder.events).toEqual([])
    expect(game.screen).toBe(Screen.QuestionPreparation)
  })

  test('cancelQuestion goes back to the Table, the question stays available', async () => {
    const game = await tableGame()
    addPlayer(game, 'Вася', 'KeyA')
    const q100 = question(game, 100)
    game.selectQuestion(q100.id)
    game.playerUsedButton('KeyA')
    game.next()
    const recorder = record(game)

    game.cancelQuestion()

    expect(game.screen).toBe(Screen.Table)
    expect(q100.isAvailable).toBe(true)
    expect(q100.pageIndex).toBe(0)
    expect(game.package?.currentQuestion).toBeNull()
    expect(game.queuePlayersIds).toEqual([])
    expect(game.isButtonsActive).toBe(false)
    expect(recorder.names()).toEqual([GameEvent.QueuePlayersUpdated, GameEvent.StartTable])
    expect(game.getTablePayload().themes[0].questions.find(item => item.id === q100.id)?.isAvailable).toBe(true)

    game.selectQuestion(q100.id)
    expect(game.screen).toBe(Screen.Question)
    expect(q100.pageIndex).toBe(0)
  })

  test('cancelQuestion from QuestionPreparation; on other screens it does nothing', async () => {
    const game = await tableGame()
    const stake = question(game, 200)
    game.selectQuestion(stake.id)
    game.cancelQuestion()
    expect(game.screen).toBe(Screen.Table)
    expect(stake.isAvailable).toBe(true)

    const recorder = record(game)
    game.cancelQuestion()
    expect(recorder.events).toEqual([])
    expect(game.screen).toBe(Screen.Table)
  })
})

describe('Game: players', () => {
  test('addPlayer pushes the new player with queue null', () => {
    const game = newGame()
    const recorder = record(game)
    const player = game.addPlayer()
    expect(game.players).toEqual([player])
    expect(recorder.of(GameEvent.UpdatePlayers)).toEqual([[{
      added: [{ id: player.id, name: '', keyboardKey: '', lose: 0, win: 0, queue: null, score: 0 }],
      removed: [],
      updated: [],
      currentSelector: null,
    }]])
  })

  test('updatePlayer sets name and key; without a key the key is kept', () => {
    const game = newGame()
    const player = addPlayer(game, 'Вася', 'KeyA')
    expect(game.getPlayerByKey('KeyA')).toBe(player)
    game.updatePlayer(player.id, 'Василий')
    expect(player.name).toBe('Василий')
    expect(player.keyboardKey).toBe('KeyA')
    game.updatePlayer('nope', 'x', 'KeyB')
    expect(game.getPlayerByKey('KeyB')).toBeUndefined()
  })

  test('keyPress queues a player only while the buttons are active', async () => {
    const game = await tableGame()
    const vasya = addPlayer(game, 'Вася', 'KeyA')
    const petya = addPlayer(game, 'Петя', 'KeyB')

    game.playerUsedButton('KeyA')
    expect(game.queuePlayersIds).toEqual([])

    game.selectQuestion(question(game, 200).id)
    game.playerUsedButton('KeyA')
    game.next()
    game.playerUsedButton('KeyA')
    expect(game.queuePlayersIds).toEqual([])
    game.cancelQuestion()

    game.selectQuestion(question(game, 100).id)
    game.playerUsedButton('KeyB')
    game.playerUsedButton('KeyA')
    game.playerUsedButton('KeyB')
    game.playerUsedButton('KeyZ')
    expect(game.queuePlayersIds).toEqual([petya.id, vasya.id])
    expect(game.playersWithQueue.map(player => [player.name, player.queue])).toEqual([['Вася', 1], ['Петя', 0]])

    game.next()
    game.next()
    game.next()
    expect(game.screen).toBe(Screen.Table)
    game.playerUsedButton('KeyA')
    expect(game.queuePlayersIds).toEqual([])
  })

  test('win / lose: the score value is added or taken, the loser leaves the queue, the winner chooses next', async () => {
    const game = await tableGame()
    const vasya = addPlayer(game, 'Вася', 'KeyA')
    const petya = addPlayer(game, 'Петя', 'KeyB')
    const q100 = question(game, 100)
    game.selectQuestion(q100.id)
    game.playerUsedButton('KeyA')
    game.playerUsedButton('KeyB')

    game.losePlayer(vasya.id)
    expect(vasya.score).toBe(-100)
    expect(vasya.loseCount).toBe(1)
    expect(game.queuePlayersIds).toEqual([petya.id])

    game.score.setValue(250)
    const recorder = record(game)
    game.winPlayer(petya.id)
    expect(petya.score).toBe(250)
    expect(petya.winCount).toBe(1)
    expect(game.currentSelector).toBe(petya.id)
    expect(q100.pageIndex).toBe(2)
    expect(recorder.names()).toContain(GameEvent.UpdatePage)

    game.winPlayer('nope')
    game.losePlayer('nope')
    expect(game.currentSelector).toBe(petya.id)
  })

  test('a correct answer clears the queue and ignores later buzzers', async () => {
    const game = await tableGame()
    const vasya = addPlayer(game, 'Вася', 'KeyA')
    const petya = addPlayer(game, 'Петя', 'KeyB')
    const q100 = question(game, 100)
    game.selectQuestion(q100.id)
    game.playerUsedButton('KeyA')
    game.playerUsedButton('KeyB')

    game.winPlayer(vasya.id)
    expect(game.queuePlayersIds).toEqual([])
    expect(game.isButtonsActive).toBe(false)

    game.playerUsedButton('KeyB')
    expect(game.queuePlayersIds).toEqual([])
    expect(game.playersWithQueue.find(p => p.id === petya.id)?.queue).toBeNull()
  })

  test('winPlayer shows the answer from its first page; the rest of a long answer follows with next', async () => {
    const game = await tableGame()
    const vasya = addPlayer(game, 'Вася', 'KeyA')
    const q500 = question(game, 500)
    game.selectQuestion(q500.id)
    game.next()
    expect(game.screen).toBe(Screen.Question)
    expect(q500.pages?.map(item => item.isMarker)).toEqual([false, false, false, true, false])

    game.mediaPlayer.update(7, false)
    const recorder = record(game)
    game.winPlayer(vasya.id)
    expect(q500.pageIndex).toBe(3)
    expect(q500.currentPage).toEqual(expect.objectContaining({ isMarker: true, text: 'Ответ текстом' }))
    expect(recorder.of(GameEvent.UpdatePage)).toHaveLength(1)
    expect(recorder.of(GameEvent.UpdateMediaPlayer)).toEqual([[{ time: 0, isPlaying: true }]])

    game.next()
    expect(q500.currentPage).toEqual(expect.objectContaining({ image: 'answer.png' }))
    recorder.clear()
    game.winPlayer(vasya.id)
    expect(q500.pageIndex).toBe(4)
    expect(recorder.of(GameEvent.UpdatePage)).toEqual([])

    game.next()
    expect(game.screen).toBe(Screen.Table)
    expect(q500.isAvailable).toBe(false)
  })

  test('a player update carries the whole player, with its queue position, and the current selector', async () => {
    const game = await tableGame()
    const vasya = addPlayer(game, 'Вася', 'KeyA')
    const petya = addPlayer(game, 'Петя', 'KeyB')
    game.selectPlayer(petya.id)
    game.selectQuestion(question(game, 100).id)
    game.playerUsedButton('KeyB')
    game.playerUsedButton('KeyA')

    const recorder = record(game)
    vasya.setScore(50)
    game.updatePlayer(vasya.id, 'Василий')
    game.winPlayer(vasya.id)
    const update = (player: Record<string, unknown>, currentSelector: string): EventUpdatePlayers => ({
      added: [],
      removed: [],
      updated: [expect.objectContaining(player) as EventUpdatePlayers['updated'][number]],
      currentSelector,
    })
    expect(recorder.of(GameEvent.UpdatePlayers).map(([event]) => event)).toEqual([
      update({ id: vasya.id, score: 50, queue: 1 }, petya.id),
      update({ id: vasya.id, name: 'Василий', queue: 1 }, petya.id),
      update({ id: vasya.id, score: 150, win: 1, queue: 1 }, vasya.id),
    ])
  })

  test('a removed player is not pushed any more', () => {
    const game = newGame()
    const vasya = addPlayer(game, 'Вася', 'KeyA')
    game.removePlayer(vasya.id)
    const recorder = record(game)
    vasya.setScore(10)
    expect(recorder.events).toEqual([])
  })

  test('selectPlayer: queue on the Question, selector on the Table and QuestionPreparation', async () => {
    const game = await tableGame()
    const vasya = addPlayer(game, 'Вася', 'KeyA')
    const petya = addPlayer(game, 'Петя', 'KeyB')

    game.selectPlayer(vasya.id)
    expect(game.currentSelector).toBe(vasya.id)

    game.selectQuestion(question(game, 200).id)
    game.selectPlayer(petya.id)
    expect(game.currentSelector).toBe(petya.id)

    game.next()
    game.selectPlayer(vasya.id)
    expect(game.queuePlayersIds).toEqual([vasya.id])
    expect(game.currentSelector).toBe(petya.id)

    game.selectPlayer('nope')
    expect(game.queuePlayersIds).toEqual([vasya.id])

    game.nextRound()
    game.selectPlayer(vasya.id)
    expect(game.currentSelector).toBe(petya.id)
  })

  test('removePlayer removes the player from the queue and from currentSelector', async () => {
    const game = await tableGame()
    const vasya = addPlayer(game, 'Вася', 'KeyA')
    const petya = addPlayer(game, 'Петя', 'KeyB')
    const kolya = addPlayer(game, 'Коля', 'KeyC')
    game.selectPlayer(petya.id)
    game.selectQuestion(question(game, 100).id)
    for (const key of ['KeyA', 'KeyB', 'KeyC']) {
      game.playerUsedButton(key)
    }

    const recorder = record(game)
    game.removePlayer(vasya.id)
    expect(game.queuePlayersIds).toEqual([petya.id, kolya.id])
    expect(game.playersWithQueue.map(player => [player.name, player.queue])).toEqual([['Петя', 0], ['Коля', 1]])
    expect(recorder.of(GameEvent.UpdatePlayers)).toEqual([[{ added: [], removed: [vasya.id], updated: [], currentSelector: petya.id }]])
    expect(recorder.names()).toContain(GameEvent.QueuePlayersUpdated)

    game.removePlayer(petya.id)
    expect(game.currentSelector).toBeNull()
    expect(game.queuePlayersIds).toEqual([kolya.id])
    expect(game.players).toEqual([kolya])
    game.playerUsedButton('KeyA')
    expect(game.queuePlayersIds).toEqual([kolya.id])
  })
})

describe('Game: packs', () => {
  test('a new pack resets the per-pack state but keeps the players and their scores', async () => {
    const game = await tableGame()
    const vasya = addPlayer(game, 'Вася', 'KeyA')
    game.selectPlayer(vasya.id)
    game.selectQuestion(question(game, 100).id)
    game.playerUsedButton('KeyA')
    game.winPlayer(vasya.id)
    game.mediaPlayer.update(12, false)
    expect(vasya.score).toBe(100)

    const recorder = record(game)
    await game.loadPack(siq4)

    expect(game.screen).toBe(Screen.Screensaver)
    expect(game.packageName).toBe('SIQ4 пак')
    expect(game.package?.currentQuestion).toBeNull()
    expect(game.score.value).toBe(0)
    expect(game.currentSelector).toBeNull()
    expect(game.queuePlayersIds).toEqual([])
    expect(game.isButtonsActive).toBe(false)
    expect({ time: game.mediaPlayer.time, isPlaying: game.mediaPlayer.isPlaying }).toEqual({ time: 0, isPlaying: true })
    expect(game.progress).toEqual({ roundIndex: 0, roundsCount: 1, questionsPlayed: 0, questionsTotal: 5 })
    expect(game.players).toEqual([vasya])
    expect([vasya.score, vasya.winCount, vasya.name]).toEqual([100, 1, 'Вася'])
    expect(recorder.names().filter(name => name.startsWith('Start'))).toEqual([GameEvent.StartScreensaver])
    expect(recorder.of(GameEvent.UpdateScoreValue)).toEqual([[0]])

    expect(listFiles(game.packDir)).toEqual(['Audio/ans.mp3', 'Images/cat.png'])
  })

  test('loading a pack with a negative-price question emits nothing while parsing (B8)', async () => {
    const game = await tableGame(siq4)
    const recorder = record(game)
    await game.loadPack(siq5)
    expect(recorder.names()).not.toContain(GameEvent.StartTable)
    expect(recorder.names()).not.toContain(GameEvent.StartQuestion)
    expect(recorder.names()).not.toContain(GameEvent.StartResults)
    expect(game.screen).toBe(Screen.Screensaver)
  })

  test('a broken pack is rejected and the current game goes on', async () => {
    const game = await tableGame()
    const q100 = question(game, 100)
    game.selectQuestion(q100.id)
    const recorder = record(game)

    await expect(game.loadPack(broken)).rejects.toThrow()
    await expect(game.loadPack(noContent)).rejects.toThrow(/content\.xml/)
    await expect(game.loadPack(path.join(path.dirname(broken), 'missing.siq'))).rejects.toThrow()
    await expect(game.loadPack(writeZip(path.join(path.dirname(broken), 'norounds.siq'), { 'content.xml': packageXml('').replace(/<rounds>[\s\S]*<\/rounds>/, '') })))
      .rejects.toThrow(/раунд/)

    expect(recorder.events).toEqual([])
    expect(game.screen).toBe(Screen.Question)
    expect(game.packageName).toBe('Тестовый пак')
    expect(game.package?.currentQuestion).toBe(q100)
    expect(fs.existsSync(path.join(game.packDir, 'Images', 'pic 1.png'))).toBe(true)

    await game.loadPack(siq4)
    expect(game.packageName).toBe('SIQ4 пак')
  })

  test('a malicious pack loads without writing outside its directory', async () => {
    const game = newGame()
    await game.loadPack(evil)
    expect(game.screen).toBe(Screen.Screensaver)
    expect(listFiles(game.packDir)).toEqual(['Images/%E0%A4%A.png', 'Images/100%.png', 'Images/ok file.png', 'Images/sub/deep.png', 'sibling.mp3'])
    const gameDirs = new Set(games.map(item => path.relative(process.env.PACKAGES_DIR!, item.packDir).split(path.sep).join('/')))
    expect(listFiles(process.env.PACKAGES_DIR!).filter(file => !gameDirs.has(file.split('/').slice(0, 2).join('/')))).toEqual([])
    expect(fs.existsSync(path.join(path.dirname(evil), 'absolute-escape.txt'))).toBe(false)
  })

  test('only one pack loads at a time', async () => {
    const game = newGame()
    const first = game.loadPack(siq5)
    await expect(game.loadPack(siq4)).rejects.toThrow(GameError)
    await first
    expect(game.packageName).toBe('Тестовый пак')
  })

  test('closing the game while its pack loads: the load fails and the media are removed', async () => {
    const game = newGame()
    const recorder = record(game)
    const loading = game.loadPack(siq5)
    game.closeGame()
    await expect(loading).rejects.toThrow(GameError)
    expect(fs.existsSync(game.packDir)).toBe(false)
    expect(game.package).toBeNull()
    expect(recorder.names()).toEqual([GameEvent.Exit])
    await expect(game.loadPack(siq5)).rejects.toThrow(GameError)
  })

  test('closeGame emits Exit once and detaches all listeners', async () => {
    const game = await tableGame()
    const recorder = record(game)
    game.closeGame()
    game.closeGame()
    expect(game.isClosed).toBe(true)
    expect(recorder.names()).toEqual([GameEvent.Exit])
    game.addPlayer()
    expect(recorder.names()).toEqual([GameEvent.Exit])
  })

  test('startGame reads the pack from SIQ_DIR', async () => {
    fs.copyFileSync(siq4, path.join(process.env.SIQ_DIR!, 'from-siq-dir.siq'))
    const game = newGame()
    await game.startGame('from-siq-dir.siq')
    expect(game.packageName).toBe('SIQ4 пак')
  })
})

describe('Game: snapshots', () => {
  test('getScreenData for every screen', async () => {
    const game = newGame()
    const vasya = addPlayer(game, 'Вася', 'KeyA')
    expect(game.getScreenData()).toEqual({ screen: Screen.Initial, payload: {} })

    await game.loadPack(siq5)
    expect(game.getScreenData()).toEqual({ screen: Screen.Screensaver, payload: {} })

    game.next()
    expect(game.getScreenData()).toEqual({ screen: Screen.ThemeList, payload: { themes: ['Тема 1', 'Тема 2', 'Тема 3', 'Ф1', 'Ф2', 'Ф3'] } })

    game.next()
    expect(game.getScreenData()).toEqual({
      screen: Screen.RoundName,
      payload: { name: 'Раунд 1', progress: { roundIndex: 0, roundsCount: 2, questionsPlayed: 1, questionsTotal: 6 } },
    })

    game.next()
    expect(game.getScreenData()).toEqual({ screen: Screen.ThemeListInRound, payload: { themes: ['Тема 1', 'Тема 2', 'Тема 3'] } })

    game.next()
    const table = game.getScreenData()
    expect(table.screen).toBe(Screen.Table)
    expect(table.payload).toEqual({
      type: RoundType.DEFAULT,
      themes: game.package!.currentRound.themes.map(theme => ({
        name: theme.name,
        questions: theme.questions.map(item => ({ id: item.id, isAvailable: item.price >= 0, price: item.price })),
      })),
      currentSelector: null,
      progress: { roundIndex: 0, roundsCount: 2, questionsPlayed: 1, questionsTotal: 6 },
    })

    const secret = question(game, 400)
    game.selectPlayer(vasya.id)
    game.selectQuestion(secret.id)
    expect(game.getScreenData()).toEqual({
      screen: Screen.QuestionPreparation,
      payload: {
        id: secret.id,
        comments: null,
        currentPage: { text: 'Кот в мешке', replic: null, image: null, video: null, voice: null, html: null, htmlFile: null, isMarker: false },
        nextPage: { text: 'B', replic: null, image: null, video: null, voice: null, html: null, htmlFile: null, isMarker: true },
        pageIndex: 0,
        pagesCount: 2,
        isAvailable: true,
        price: 400,
        rightAnswer: ['B'],
        selectionMode: 'exceptCurrent',
        selectPrice: { minimum: 400, maximum: 400, step: 0, type: 'accurate' },
        themeName: 'Секретная тема',
        type: QuestionType.SECRET,
        wrongAnswer: null,
        currentSelector: vasya.id,
        answerGroup: [
          { answer: 'Альфа', variant: 'A' },
          { answer: { '#text': 'b.png' }, variant: 'B' },
          { answer: '42', variant: 'C' },
        ],
        answerType: 'group',
      },
    })

    game.next()
    const questionScreen = game.getScreenData()
    expect(questionScreen.screen).toBe(Screen.Question)
    expect(questionScreen.payload).toEqual(game.getQuestionPayload(secret))
    game.next()
    expect(game.getQuestionPagePayload()).toEqual({
      currentPage: { text: 'B', replic: null, image: null, video: null, voice: null, html: null, htmlFile: null, isMarker: true },
      nextPage: null,
      pageIndex: 1,
      pagesCount: 2,
    })

    game.next()
    playRound(game)
    expect(game.getScreenData()).toEqual({
      screen: Screen.Results,
      payload: {
        players: game.playersWithQueue,
        isLastRound: false,
        progress: { roundIndex: 0, roundsCount: 2, questionsPlayed: 6, questionsTotal: 6 },
      },
    })
  })

  test('getSnapshot and getSettings', async () => {
    const game = await tableGame()
    const vasya = addPlayer(game, 'Вася', 'KeyA')
    game.setScoreBig(200)
    game.setScoreLittle(50)
    game.setVolumeSettings(30, 100)
    game.mediaPlayer.update(3, false)

    expect(game.getSnapshot()).toEqual({
      gameId: game.id,
      gameName: 'Тест',
      packageName: 'Тестовый пак',
      players: [{ id: vasya.id, name: 'Вася', keyboardKey: 'KeyA', score: 0, win: 0, lose: 0, queue: null }],
      score: 0,
      scoreBig: 200,
      scoreLittle: 50,
      progress: game.progress,
      screenData: game.getScreenData(),
      media: { time: 3, isPlaying: false },
    })
    expect(game.getSettings()).toEqual({ scoreValue: 0, big: 200, little: 50, adminVolume: 100, playerVolume: 30 })
  })

  test('the snapshot carries the media state so a reloaded screen resumes where the host left it', async () => {
    const game = await tableGame()
    game.selectQuestion(question(game, 100).id)
    game.mediaPlayer.update(12.5, false)
    expect(game.getSnapshot().media).toEqual({ time: 12.5, isPlaying: false })

    game.next()
    const { media } = game.getSnapshot()
    expect(media.isPlaying).toBe(true)
    expect(media.time).toBeGreaterThanOrEqual(0)
    expect(media.time).toBeLessThan(1)
  })

  test('setScoreLittle, setScoreBig and setVolumeSettings change the settings and emit UpdateSettings each time', () => {
    const game = newGame()
    const recorder = record(game)

    game.setScoreLittle(30)
    expect(game.getSettings()).toEqual({ scoreValue: 0, big: 100, little: 30, adminVolume: 100, playerVolume: 100 })
    game.setScoreBig(300)
    expect(game.getSettings()).toMatchObject({ big: 300, little: 30 })
    game.setVolumeSettings(10, 0)
    expect(game.getSettings()).toEqual({ scoreValue: 0, big: 300, little: 30, adminVolume: 0, playerVolume: 10 })
    game.setScoreBig(300)

    expect(recorder.names()).toEqual([GameEvent.UpdateSettings, GameEvent.UpdateSettings, GameEvent.UpdateSettings, GameEvent.UpdateSettings])
    expect(recorder.of(GameEvent.UpdateSettings)).toEqual([[], [], [], []])
  })

  test('score steps and value changes are not settings changes', () => {
    const game = newGame()
    const recorder = record(game)
    game.score.bigPlus()
    game.score.littleMinus()
    game.score.setValue(5)
    expect(recorder.of(GameEvent.UpdateSettings)).toEqual([])
    expect(recorder.of(GameEvent.UpdateScoreValue)).toEqual([[100], [80], [5]])
  })

  test('without a current question the question screens fall back to the Table payload', async () => {
    const game = await tableGame()
    game.selectQuestion(question(game, 100).id)
    game.package!.setCurrentQuestion(null)
    expect(game.getScreenData().screen).toBe(Screen.Table)
    expect(game.getQuestionPagePayload()).toEqual({ currentPage: null, nextPage: null, pageIndex: 0, pagesCount: 0 })
    game.next()
    expect(game.screen).toBe(Screen.Table)
  })
})
