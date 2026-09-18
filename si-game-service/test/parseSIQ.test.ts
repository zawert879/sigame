import fs from 'fs'
import path from 'path'
import { parseSIQ, readSiqName } from '../src/utils/parseSIQ'
import { makeTempDir, noContentEntries, PNG, SIQ4_XML, siq5Entries, SIQ5_XML, writeZip, type ZipEntries } from './helpers/fixtures'

describe('parseSIQ', () => {
  let dir: string
  let counter = 0
  const pack = (entries: ZipEntries) => writeZip(path.join(dir, `pack-${counter++}.siq`), entries)

  beforeAll(() => {
    dir = makeTempDir('parse-')
  })

  test('classifies entries by folder prefix, keyed by "@<name without the folder>"', () => {
    const data = parseSIQ(pack({
      'content.xml': SIQ5_XML,
      'Images/pic%201.png': PNG,
      'Images/sub/deep.png': PNG,
      'Images/': '',
      'Audio/song.mp3': 'a',
      'Video/clip.mp4': 'v',
      'Texts/notes.txt': 't',
      'images/lower.png': PNG,
      'Other/file.bin': 'x',
      'readme.txt': 'x',
    }))

    expect([...data.images.keys()].sort()).toEqual(['@pic%201.png', '@sub/deep.png'])
    expect([...data.audios.keys()]).toEqual(['@song.mp3'])
    expect([...data.videos.keys()]).toEqual(['@clip.mp4'])
    expect([...data.texts.keys()]).toEqual(['@notes.txt'])
    expect(data.images.get('@pic%201.png')?.entryName).toBe('Images/pic%201.png')
    expect(data.audios.get('@song.mp3')?.getData().toString()).toBe('a')
  })

  test('keeps numeric texts as strings (\'007\' is not 7)', () => {
    const { content } = parseSIQ(pack(siq5Entries()))
    // raw parser output: a single element is an object, repeated elements are an array
    type Question100 = { attributes: { price: string }; params: { param: { item: unknown[] } } }
    type Question200 = { params: { param: Array<{ attributes: { name: string }; item: unknown }> }; right: { answer: unknown } }
    type RawPackage = {
      rounds: { round: Array<{ themes: { theme: Array<{ questions: { question: [Question100, Question200] } }> } }> };
      tags: { tag: unknown };
    }
    const pkg = content.package as unknown as RawPackage
    const [q100, q200] = pkg.rounds.round[0].themes.theme[0].questions.question

    expect(q100.params.param.item[0]).toBe('007')
    expect(q100.attributes.price).toBe('100')
    const answerParam = q200.params.param.find(param => param.attributes.name === 'answer')
    expect(answerParam!.item).toBe('1984')
    expect(q200.right.answer).toBe('1984')
    expect(pkg.tags.tag).toEqual(['тест', '1984'])
  })

  test('strips a UTF-8 BOM from content.xml', () => {
    const { content } = parseSIQ(pack({ 'content.xml': `\uFEFF${SIQ4_XML}` }))
    expect(content.package?.attributes?.name).toBe('SIQ4 пак')
  })

  test('throws for a pack without content.xml', () => {
    expect(() => parseSIQ(pack(noContentEntries()))).toThrow(/content\.xml/)
  })

  test('throws when content.xml has no package element or is not XML', () => {
    expect(() => parseSIQ(pack({ 'content.xml': '<?xml version="1.0"?><notapackage/>' }))).toThrow(/package/)
    expect(() => parseSIQ(pack({ 'content.xml': '<package><rounds>' }))).toThrow()
    expect(() => parseSIQ(pack({ 'content.xml': '' }))).toThrow()
  })

  test('throws for a file that is not a zip', () => {
    const file = path.join(dir, 'broken.siq')
    fs.writeFileSync(file, 'not a zip')
    expect(() => parseSIQ(file)).toThrow()
    expect(() => parseSIQ(path.join(dir, 'missing.siq'))).toThrow()
  })
})

describe('readSiqName', () => {
  let dir: string

  beforeAll(() => {
    dir = makeTempDir('name-')
  })

  test('reads the pack name from content.xml', () => {
    expect(readSiqName(writeZip(path.join(dir, 'a.siq'), siq5Entries()))).toBe('Тестовый пак')
  })

  test('is \'\' for a pack without a name, a number-like name stays as written', () => {
    expect(readSiqName(writeZip(path.join(dir, 'b.siq'), { 'content.xml': '<package version="5"><rounds/></package>' }))).toBe('')
    expect(readSiqName(writeZip(path.join(dir, 'c.siq'), { 'content.xml': '<package name="007"/>' }))).toBe('007')
  })

  test('throws for an unreadable pack', () => {
    expect(() => readSiqName(writeZip(path.join(dir, 'd.siq'), noContentEntries()))).toThrow()
  })
})
