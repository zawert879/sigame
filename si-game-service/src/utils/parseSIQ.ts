import AdmZip from 'adm-zip'
import { XMLParser } from 'fast-xml-parser'
import { type Data } from '../serverTypes'

// eslint-disable-next-line @typescript-eslint/naming-convention
export function parseSIQ(path: string): Data {
  const data = {
    texts: new Map<string, AdmZip.IZipEntry>(),
    images: new Map<string, AdmZip.IZipEntry>(),
    audios: new Map<string, AdmZip.IZipEntry>(),
    videos: new Map<string, AdmZip.IZipEntry>(),
    content: null,
  }

  const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributesGroupName: 'attributes',
    attributeNamePrefix: '',
  })
  const zip = new AdmZip(path)
  const zipEntries = zip.getEntries()

  zipEntries.forEach(zipEntry => {
    if (zipEntry.entryName.includes('Texts')) {
      data.texts.set(zipEntry.entryName.replace('Texts/', '@'), zipEntry)
    }

    if (zipEntry.entryName.includes('Images')) {
      data.images.set(zipEntry.entryName.replace('Images/', '@'), zipEntry)
    }

    if (zipEntry.entryName.includes('Audio')) {
      data.audios.set(zipEntry.entryName.replace('Audio/', '@'), zipEntry)
    }

    if (zipEntry.entryName.includes('Video')) {
      data.videos.set(zipEntry.entryName.replace('Video/', '@'), zipEntry)
    }

    if (zipEntry.entryName === 'content.xml') {
      const text = zipEntry.getData().toString('utf8')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data.content = xmlParser.parse(text, true)
    }
  })
  return data as unknown as Data
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function parseSIQName(path: string): string {
  const zip = new AdmZip(path)
  const zipEntries = zip.getEntries()

  const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributesGroupName: 'attributes',
    attributeNamePrefix: '',
  })
  let content: Data['content'] | undefined
  zipEntries.forEach(zipEntry => {
    if (zipEntry.entryName === 'content.xml') {
      const text = zipEntry.getData().toString('utf8')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      content = xmlParser.parse(text, true)
    }
  })

  return content?.package.attributes.name ? content.package.attributes.name : ''
}
