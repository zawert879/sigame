import fs from 'fs'
import path from 'path'
import { RoundType } from '../src/data'
import { SiqPackage } from '../src/entity/SiqPackage'
import { parseSIQ } from '../src/utils/parseSIQ'
import { listFiles, makeTempDir, maliciousEntries, packageXml, PNG, siq4Entries, siq5Entries, writeZip, type ZipEntries } from './helpers/fixtures'

let counter = 0
const packFile = (dir: string, entries: ZipEntries) => writeZip(path.join(dir, `pack-${counter++}.siq`), entries)

describe('SiqPackage model', () => {
  let siqPackage: SiqPackage

  beforeAll(() => {
    siqPackage = new SiqPackage(parseSIQ(packFile(makeTempDir('model-'), siq5Entries())))
  })

  test('package metadata', () => {
    expect(siqPackage).toMatchObject({
      name: 'Тестовый пак',
      version: '5',
      id: 't5',
      date: '18.09.2026',
      publisher: 'Издатель',
      difficulty: '5',
      language: 'ru-RU',
      authors: 'Автор А, Автор Б',
      comments: 'Комментарий пака',
      tags: ['тест', '1984'],
      logo: null,
      restriction: null,
    })
  })

  test('rounds and themes', () => {
    expect(siqPackage.rounds.map(round => [round.name, round.type])).toEqual([
      ['Раунд 1', RoundType.DEFAULT],
      ['Финал', RoundType.FINAL],
    ])
    expect(siqPackage.rounds[0].themes.map(theme => theme.name)).toEqual(['Тема 1', 'Тема 2', 'Тема 3'])
    expect(siqPackage.rounds[0].themes[1].comments).toBe('Комментарий темы')
    expect(siqPackage.rounds[0].questions).toHaveLength(6)
    expect(siqPackage.getAllThemes()).toEqual(['Тема 1', 'Тема 2', 'Тема 3', 'Ф1', 'Ф2', 'Ф3'])
    for (const round of siqPackage.rounds) {
      for (const question of round.questions) {
        expect(round.questionById.get(question.id)).toBe(question)
      }
    }
  })

  test('round navigation, isLastRound and progress', () => {
    const pack = new SiqPackage(parseSIQ(packFile(makeTempDir('nav-'), siq5Entries())))
    expect(pack.roundIndex).toBe(0)
    expect(pack.isLastRound).toBe(false)
    expect(pack.progress).toEqual({ roundIndex: 0, roundsCount: 2, questionsPlayed: 1, questionsTotal: 6 })

    const [question] = pack.currentRound.questions
    pack.setCurrentQuestion(question)
    expect(pack.currentQuestion).toBe(question)
    question.markPlayed()
    expect(pack.progress.questionsPlayed).toBe(2)

    expect(pack.nextRound()).toBe(true)
    expect(pack.currentQuestion).toBeNull()
    expect(pack.isLastRound).toBe(true)
    expect(pack.getCurrentRound().name).toBe('Финал')
    expect(pack.progress).toEqual({ roundIndex: 1, roundsCount: 2, questionsPlayed: 0, questionsTotal: 3 })
    expect(pack.nextRound()).toBe(false)
    expect(pack.roundIndex).toBe(1)

    pack.previousRound()
    expect(pack.roundIndex).toBe(0)
    pack.previousRound()
    expect(pack.roundIndex).toBe(0)

    pack.setCurrentQuestion(question)
    pack.close()
    expect(pack.currentQuestion).toBeNull()
  })

  test('a pack without rounds is rejected', () => {
    const dir = makeTempDir('empty-')
    expect(() => new SiqPackage(parseSIQ(packFile(dir, { 'content.xml': '<package name="x"><rounds></rounds></package>' })))).toThrow(/раунд/)
    expect(() => new SiqPackage(parseSIQ(packFile(dir, { 'content.xml': '<package name="x"/>' })))).toThrow(/раунд/)
  })

  test('a round without themes and a theme without questions are empty, not errors', () => {
    const pack = new SiqPackage(parseSIQ(packFile(makeTempDir('sparse-'), {
      'content.xml': '<package name="x"><rounds><round name="a"></round><round name="b"><themes><theme name="t"/></themes></round></rounds></package>',
    })))
    expect(pack.rounds[0].themes).toEqual([])
    expect(pack.rounds[0].hasAvailableQuestions).toBe(false)
    expect(pack.rounds[1].themes[0].questions).toEqual([])
  })
})

describe('SiqPackage.saveAssets', () => {
  test('writes Images / Audio / Video with URI-decoded names; texts are not written', async () => {
    const dir = makeTempDir('assets-')
    const packDir = path.join(dir, 'games', 'g1')
    await SiqPackage.saveAssets(parseSIQ(packFile(dir, siq5Entries())), packDir)

    expect(listFiles(packDir)).toEqual(['Audio/song.mp3', 'Images/answer.png', 'Images/b.png', 'Images/pic 1.png', 'Video/clip.mp4'])
    expect(fs.readFileSync(path.join(packDir, 'Images', 'pic 1.png'))).toEqual(PNG)
    expect(fs.readFileSync(path.join(packDir, 'Audio', 'song.mp3'), 'utf8')).toBe('ID3 song')
  })

  test('writes Html/ with URI-decoded names next to the media; zip-slip entries of Html/ are skipped', async () => {
    const dir = makeTempDir('html-')
    const packDir = path.join(dir, 'games', 'g1')
    const siq = parseSIQ(packFile(dir, {
      'content.xml': packageXml('<question price="1"/>'),
      'Html/page%201.html': '<p>1</p>',
      'Html/%D1%81%D1%82%D1%80.html': '<p>2</p>',
      'Html/assets/app.js': 'void 0',
      'Html/..%2F..%2F..%2Fhtml-escape.html': 'escape',
      'Html/../../raw-html-escape.html': 'escape',
      'Images/a.png': PNG,
    }))
    jest.mocked(console.warn).mockClear()

    await SiqPackage.saveAssets(siq, packDir)

    expect(listFiles(packDir)).toEqual(['Html/assets/app.js', 'Html/page 1.html', 'Html/стр.html', 'Images/a.png'])
    expect(fs.readFileSync(path.join(packDir, 'Html', 'page 1.html'), 'utf8')).toBe('<p>1</p>')
    expect(listFiles(dir).filter(file => !file.startsWith('games/g1/'))).toEqual([expect.stringMatching(/^pack-\d+\.siq$/)])
    const skipped = jest.mocked(console.warn).mock.calls.map(call => String(call[0]))
    expect(skipped).toHaveLength(2)
    expect(skipped.every(message => message.includes('escape.html'))).toBe(true)
  })

  test('zip-slip entries are skipped, bad escapes are kept raw, nothing is written outside the pack directory', async () => {
    const dir = makeTempDir('slip-')
    const absoluteTarget = path.join(dir, 'absolute-escape.txt')
    const packDir = path.join(dir, 'games', 'g1')
    const siq = parseSIQ(packFile(path.join(dir, 'packs'), maliciousEntries(absoluteTarget)))
    jest.mocked(console.warn).mockClear()

    await expect(SiqPackage.saveAssets(siq, packDir)).resolves.toBeUndefined()

    expect(listFiles(packDir)).toEqual([
      'Images/%E0%A4%A.png',
      'Images/100%.png',
      'Images/ok file.png',
      'Images/sub/deep.png',
      'sibling.mp3',
    ])
    expect(listFiles(dir).filter(file => !file.startsWith('games/g1/'))).toEqual([expect.stringMatching(/^packs\/pack-\d+\.siq$/)])
    expect(fs.existsSync(absoluteTarget)).toBe(false)

    const skipped = jest.mocked(console.warn).mock.calls.map(call => String(call[0]))
    expect(skipped).toHaveLength(4)
    for (const name of ['raw-escape.txt', 'encoded-escape.txt', 'nested-escape.txt', 'absolute-escape.txt']) {
      expect(skipped.some(message => message.includes(name))).toBe(true)
    }
  })

  test('a file that cannot be written is logged, the other files are still written', async () => {
    const dir = makeTempDir('fail-')
    const packDir = path.join(dir, 'g1')
    fs.mkdirSync(path.join(packDir, 'Images', 'blocked.png'), { recursive: true })
    const siq = parseSIQ(packFile(dir, {
      'content.xml': packageXml('<question price="1"/>'),
      'Images/blocked.png': PNG,
      'Images/fine.png': PNG,
    }))
    jest.mocked(console.error).mockClear()

    await expect(SiqPackage.saveAssets(siq, packDir)).resolves.toBeUndefined()

    expect(fs.existsSync(path.join(packDir, 'Images', 'fine.png'))).toBe(true)
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Images/blocked.png'), expect.anything())
  })

  test('a pack without media creates the (empty) pack directory', async () => {
    const dir = makeTempDir('nomedia-')
    const packDir = path.join(dir, 'g1')
    await SiqPackage.saveAssets(parseSIQ(packFile(dir, siq4Entries())), packDir)
    expect(listFiles(packDir)).toEqual(['Audio/ans.mp3', 'Images/cat.png'])

    const emptyDir = path.join(dir, 'g2')
    await SiqPackage.saveAssets(parseSIQ(packFile(dir, { 'content.xml': packageXml('') })), emptyDir)
    expect(fs.existsSync(emptyDir)).toBe(true)
    expect(listFiles(emptyDir)).toEqual([])
  })
})
