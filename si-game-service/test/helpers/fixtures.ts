import AdmZip from 'adm-zip'
import fs from 'fs'
import path from 'path'
import type { PageSnapshotType } from '../../src/types'

export type ZipEntries = Record<string, string | Buffer>

export const page = (fields: Partial<PageSnapshotType>): PageSnapshotType => ({
  text: null,
  replic: null,
  image: null,
  video: null,
  voice: null,
  html: null,
  htmlFile: null,
  isMarker: false,
  ...fields,
})

export const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex')

export const SIQ5_XML = `<?xml version="1.0" encoding="utf-8"?>
<package name="Тестовый пак" version="5" id="t5" date="18.09.2026" publisher="Издатель" difficulty="5" language="ru-RU" xmlns="https://github.com/VladimirKhil/SI/blob/master/assets/siq_5.xsd">
  <tags><tag>тест</tag><tag>1984</tag></tags>
  <info>
    <authors><author>Автор А</author><author>Автор Б</author></authors>
    <comments>Комментарий пака</comments>
  </info>
  <rounds>
    <round name="Раунд 1">
      <themes>
        <theme name="Тема 1">
          <questions>
            <question price="100">
              <params>
                <param name="question" type="content">
                  <item>007</item>
                  <item type="image" isRef="True">pic 1.png</item>
                </param>
              </params>
              <right><answer>Бонд</answer></right>
            </question>
            <question price="200" type="stake">
              <params>
                <param name="question" type="content"><item>Ставка</item></param>
                <param name="answer" type="content"><item>1984</item></param>
                <param name="price" type="numberSet"><numberSet minimum="100" maximum="500" step="100" /></param>
              </params>
              <right><answer>1984</answer></right>
            </question>
            <question price="-1">
              <params><param name="question" type="content"><item>Не играется</item></param></params>
              <right><answer>Никогда</answer></right>
            </question>
          </questions>
        </theme>
        <theme name="Тема 2">
          <info><comments>Комментарий темы</comments></info>
          <questions>
            <question price="300">
              <params>
                <param name="question" type="content"><item>Выбери вариант</item></param>
                <param name="answerType">select</param>
                <param name="answerOptions" type="group">
                  <param name="A" type="content"><item>Один</item></param>
                </param>
              </params>
              <right><answer>A</answer></right>
            </question>
            <question price="400" type="secret">
              <params>
                <param name="theme">Секретная тема</param>
                <param name="selectionMode">exceptCurrent</param>
                <param name="price" type="numberSet"><numberSet minimum="400" maximum="400" /></param>
                <param name="question" type="content"><item>Кот в мешке</item></param>
                <param name="answerOptions" type="group">
                  <param name="A" type="content"><item>Альфа</item></param>
                  <param name="B" type="content"><item type="image" isRef="True">b.png</item></param>
                  <param name="C" type="content"><item>42</item></param>
                </param>
              </params>
              <right><answer>B</answer></right>
            </question>
          </questions>
        </theme>
        <theme name="Тема 3">
          <questions>
            <question price="500" type="noRisk">
              <info><comments>Комментарий вопроса</comments></info>
              <params>
                <param name="question" type="content">
                  <item placement="replic">Реплика ведущего</item>
                  <item type="audio" isRef="True" waitForFinish="False">song.mp3</item>
                  <item>Что звучит?</item>
                  <item type="video" isRef="True">clip.mp4</item>
                  <item type="html">https://example.com/page.html</item>
                </param>
                <param name="answer" type="content">
                  <item>Ответ текстом</item>
                  <item type="image" isRef="True">answer.png</item>
                </param>
              </params>
              <right><answer>Песня</answer><answer>Мелодия</answer></right>
              <wrong><answer>Шум</answer></wrong>
            </question>
          </questions>
        </theme>
      </themes>
    </round>
    <round name="Финал" type="final">
      <themes>
        <theme name="Ф1"><questions><question price="0"><params><param name="question" type="content"><item>Ф1 вопрос</item></param></params><right><answer>ф1</answer></right></question></questions></theme>
        <theme name="Ф2"><questions><question price="0"><params><param name="question" type="content"><item>Ф2 вопрос</item></param></params><right><answer>ф2</answer></right></question></questions></theme>
        <theme name="Ф3"><questions><question price="0"><params><param name="question" type="content"><item>Ф3 вопрос</item></param></params><right><answer>ф3</answer></right></question></questions></theme>
      </themes>
    </round>
  </rounds>
</package>`

export const SIQ4_XML = `<?xml version="1.0" encoding="utf-8"?>
<package name="SIQ4 пак" version="4" id="t4" xmlns="http://vladimirkhil.com/ygpackage3.0.xsd">
  <info><authors><author>Автор В</author></authors></info>
  <rounds>
    <round name="Р1">
      <themes>
        <theme name="Т1">
          <questions>
            <question price="100">
              <scenario>
                <atom>Текст вопроса</atom>
                <atom type="image">@cat.png</atom>
                <atom type="say">Реплика</atom>
                <atom type="marker" />
                <atom type="voice">@ans.mp3</atom>
              </scenario>
              <right><answer>Кот</answer></right>
            </question>
            <question price="200">
              <type name="cat">
                <param name="theme">Кошки</param>
                <param name="cost">300</param>
              </type>
              <scenario><atom>Кот в мешке</atom></scenario>
              <right><answer>Мяу</answer></right>
            </question>
            <question price="300">
              <type name="auction" />
              <scenario>
                <atom>007</atom>
                <atom type="video">https://example.com/v.mp4</atom>
              </scenario>
              <right><answer>1984</answer></right>
            </question>
          </questions>
        </theme>
        <theme name="Т2">
          <questions>
            <question price="400">
              <type name="sponsored" />
              <scenario>
                <atom>Вопрос от спонсора</atom>
                <atom type="marker" />
              </scenario>
              <right><answer>Спонсор</answer></right>
            </question>
            <question price="500">
              <type name="bagcat">
                <param name="cost">0</param>
                <param name="self">true</param>
                <param name="knows">after</param>
              </type>
              <scenario><atom type="html">@page.html</atom></scenario>
              <right><answer>Ответ</answer></right>
            </question>
          </questions>
        </theme>
      </themes>
    </round>
  </rounds>
</package>`

export function packageXml(questionsXml: string, options: { name?: string; roundType?: string } = {}): string {
  const name = options.name ?? 'Пак'
  const roundType = options.roundType ? ` type="${options.roundType}"` : ''
  return `<?xml version="1.0" encoding="utf-8"?>
<package name="${name}" version="5">
  <rounds>
    <round name="Раунд"${roundType}>
      <themes>
        <theme name="Тема">
          <questions>${questionsXml}</questions>
        </theme>
      </themes>
    </round>
  </rounds>
</package>`
}

export const siq5Entries = (): ZipEntries => ({
  'content.xml': SIQ5_XML,
  'Images/pic%201.png': PNG,
  'Images/b.png': PNG,
  'Images/answer.png': PNG,
  'Audio/song.mp3': Buffer.from('ID3 song'),
  'Video/clip.mp4': Buffer.from('mp4 clip'),
  'Texts/notes.txt': 'notes',
})

export const siq4Entries = (): ZipEntries => ({
  'content.xml': SIQ4_XML,
  'Images/cat.png': PNG,
  'Audio/ans.mp3': Buffer.from('ID3 answer'),
})

export const noContentEntries = (): ZipEntries => ({
  'Images/a.png': PNG,
})

export const maliciousEntries = (absoluteTarget: string): ZipEntries => ({
  'content.xml': packageXml('<question price="100"><params><param name="question" type="content"><item>q</item></param></params></question>', { name: 'Злой пак' }),
  'Images/ok%20file.png': PNG,
  'Images/sub/deep.png': PNG,
  'Images/100%.png': PNG,
  'Images/%E0%A4%A.png': PNG,
  'Audio/..%2Fsibling.mp3': 'leaves Audio/ but stays inside the pack directory',
  'Audio/': '',
  'Images/../../raw-escape.txt': 'raw ../',
  'Images/..%2F..%2Fencoded-escape.txt': 'encoded ../',
  'Images/a%2F..%2F..%2F..%2Fnested-escape.txt': 'nested encoded ../',
  [`Video/${encodeURIComponent(absoluteTarget)}`]: 'absolute path',
})

const needsRawName = (name: string): boolean => name.split('/').some(part => part === '..' || part === '.')
  || name.includes('//')
  || name.includes('\\')
  || name.startsWith('/')

export function zipBuffer(entries: ZipEntries): Buffer {
  const zip = new AdmZip()
  const patches: Array<{ placeholder: Buffer; name: Buffer }> = []
  for (const [index, [name, content]] of Object.entries(entries).entries()) {
    const data = typeof content === 'string' ? Buffer.from(content, 'utf8') : content
    if (!needsRawName(name)) {
      zip.addFile(name, data)
      continue
    }

    const nameBytes = Buffer.from(name, 'utf8')
    const placeholder = Buffer.from(`Q${index}Q`.padEnd(nameBytes.length, 'Z'), 'ascii')
    if (placeholder.length !== nameBytes.length) {
      throw new Error(`zip entry name is too short to be patched: ${name}`)
    }

    zip.addFile(placeholder.toString('ascii'), data)
    patches.push({ placeholder, name: nameBytes })
  }

  const buffer = zip.toBuffer()
  for (const { placeholder, name } of patches) {
    const positions: number[] = []
    for (let position = buffer.indexOf(placeholder); position !== -1; position = buffer.indexOf(placeholder, position + 1)) {
      positions.push(position)
    }

    if (positions.length !== 2) {
      throw new Error(`zip entry ${name.toString()} was expected twice in the archive, found ${positions.length}`)
    }

    for (const position of positions) {
      name.copy(buffer, position)
    }
  }

  const written = new AdmZip(buffer).getEntries().map(entry => entry.entryName).sort()
  const expected = Object.keys(entries).sort()
  if (JSON.stringify(written) !== JSON.stringify(expected)) {
    throw new Error(`zip entries differ from the fixture: ${JSON.stringify(written)}`)
  }

  return buffer
}

export function writeZip(filePath: string, entries: ZipEntries): string {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, zipBuffer(entries))
  return filePath
}

export function testRoot(): string {
  const root = process.env.SIGAME_TEST_ROOT
  if (!root) {
    throw new Error('SIGAME_TEST_ROOT is not set: the tests run in test/environment.ts')
  }

  return root
}

export function makeTempDir(prefix = 'tmp-'): string {
  return fs.mkdtempSync(path.join(testRoot(), prefix))
}

export function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return []
  }

  return fs.readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
    .sort()
}
