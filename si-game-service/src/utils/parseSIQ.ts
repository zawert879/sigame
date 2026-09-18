import AdmZip from 'adm-zip'
import path from 'path'
import { XMLParser } from 'fast-xml-parser'
import { type Data, type SIQ } from '../serverTypes'
import { textOf } from './siqValue'

const CONTENT_FILE = 'content.xml'

const assetFolders: Array<[prefix: string, key: 'images' | 'audios' | 'videos' | 'htmls' | 'texts']> = [
  ['Images/', 'images'],
  ['Audio/', 'audios'],
  ['Video/', 'videos'],
  ['Html/', 'htmls'],
  ['Texts/', 'texts'],
]

const createXmlParser = () => new XMLParser({
  ignoreAttributes: false,
  attributesGroupName: 'attributes',
  attributeNamePrefix: '',
  parseTagValue: false,
})

function parseContent(entry: AdmZip.IZipEntry, filePath: string): SIQ.Content {
  const text = entry.getData().toString('utf8').replace(/^\uFEFF/, '')
  const content = createXmlParser().parse(text, true) as SIQ.Content | undefined
  if (!content?.package || typeof content.package !== 'object') {
    throw new Error(`Пак ${path.basename(filePath)}: в content.xml нет элемента package`)
  }

  return content
}

function readContentEntry(zip: AdmZip, filePath: string): AdmZip.IZipEntry {
  const entry = zip.getEntry(CONTENT_FILE)
  if (!entry || entry.isDirectory) {
    throw new Error(`Пак ${path.basename(filePath)}: нет файла ${CONTENT_FILE}`)
  }

  return entry
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function parseSIQ(filePath: string): Data {
  const zip = new AdmZip(filePath)
  const data: Data = {
    texts: new Map(),
    images: new Map(),
    audios: new Map(),
    videos: new Map(),
    htmls: new Map(),
    content: parseContent(readContentEntry(zip, filePath), filePath),
  }

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) {
      continue
    }

    const folder = assetFolders.find(([prefix]) => entry.entryName.startsWith(prefix))
    if (folder) {
      const [prefix, key] = folder
      data[key].set(`@${entry.entryName.slice(prefix.length)}`, entry)
    }
  }

  return data
}

export function readSiqName(filePath: string): string {
  const zip = new AdmZip(filePath)
  const content = parseContent(readContentEntry(zip, filePath), filePath)
  return textOf(content.package?.attributes?.name) ?? ''
}
