import type AdmZip from 'adm-zip'
import fs from 'fs/promises'
import path from 'path'
import { type Data } from '../serverTypes'
import { type GameProgress } from '../types'
import { isInsideDir, safeDecodeUriComponent } from '../utils/paths'
import { textList, textOf, toArray } from '../utils/siqValue'
import { Round } from './Round'
import type { Question } from './Question'

const assetFolders: Array<[folder: 'Images' | 'Audio' | 'Video', key: 'images' | 'audios' | 'videos']> = [
  ['Images', 'images'],
  ['Audio', 'audios'],
  ['Video', 'videos'],
]

// how many asset files are decompressed and written at the same time
const WRITE_CONCURRENCY = 8

export class SiqPackage {
  // Writes the pack media to <packDir>/<Images|Audio|Video>/<decoded entry name>.
  // Entries that would land outside packDir are skipped; a failed file is logged, never thrown.
  static async saveAssets(siq: Data, packDir: string): Promise<void> {
    const root = path.resolve(packDir)
    const jobs: Array<{ entry: AdmZip.IZipEntry; target: string }> = []
    for (const [folder, key] of assetFolders) {
      for (const entry of siq[key].values()) {
        const name = safeDecodeUriComponent(entry.entryName.slice(folder.length + 1))
        const target = path.resolve(root, folder, name)
        if (!isInsideDir(root, target)) {
          console.warn(`Пропущен файл пака вне каталога игры: ${entry.entryName}`)
          continue
        }

        jobs.push({ entry, target })
      }
    }

    await fs.mkdir(root, { recursive: true })

    let next = 0
    const worker = async () => {
      while (next < jobs.length) {
        const { entry, target } = jobs[next]
        next += 1
        try {
          // eslint-disable-next-line no-await-in-loop
          await fs.mkdir(path.dirname(target), { recursive: true })
          // eslint-disable-next-line no-await-in-loop
          await fs.writeFile(target, entry.getData())
        } catch (error) {
          console.error(`Не удалось распаковать ${entry.entryName}:`, error)
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(WRITE_CONCURRENCY, jobs.length) }, async () => worker()))
  }

  readonly rounds: Round[]
  readonly tags: string[]
  readonly authors: string | null
  readonly comments: string | null
  readonly name: string | null
  readonly version: string | null
  readonly id: string | null
  readonly restriction: string | null
  readonly date: string | null
  readonly publisher: string | null
  readonly difficulty: string | null
  readonly logo: string | null
  readonly language: string | null
  readonly xmlns: string | null

  private _roundIndex = 0
  private _currentQuestion: Question | null = null

  constructor(siq: Pick<Data, 'content'>) {
    const siqPackage = siq.content.package ?? {}
    const attributes = siqPackage.attributes ?? {}

    this.tags = textList(siqPackage.tags?.tag)
    this.comments = textOf(siqPackage.info?.comments)
    this.authors = textOf(siqPackage.info?.authors?.author)
    this.name = textOf(attributes.name)
    this.version = textOf(attributes.version)
    this.id = textOf(attributes.id)
    this.restriction = textOf(attributes.restriction)
    this.date = textOf(attributes.date)
    this.publisher = textOf(attributes.publisher)
    this.difficulty = textOf(attributes.difficulty)
    this.logo = textOf(attributes.logo)
    this.language = textOf(attributes.language)
    this.xmlns = textOf(attributes.xmlns)

    this.rounds = toArray(siqPackage.rounds?.round)
      .filter(round => typeof round === 'object' && round !== null)
      .map(round => new Round(round))
    if (this.rounds.length === 0) {
      throw new Error('В паке нет ни одного раунда')
    }
  }

  public get currentQuestion(): Question | null {
    return this._currentQuestion
  }

  public get roundIndex(): number {
    return this._roundIndex
  }

  public get currentRound(): Round {
    return this.rounds[this._roundIndex]
  }

  public get isLastRound(): boolean {
    return this._roundIndex >= this.rounds.length - 1
  }

  public get progress(): GameProgress {
    const { questions } = this.currentRound
    return {
      roundIndex: this._roundIndex,
      roundsCount: this.rounds.length,
      questionsPlayed: questions.filter(question => !question.isAvailable).length,
      questionsTotal: questions.length,
    }
  }

  public getCurrentRound(): Round {
    return this.currentRound
  }

  public getAllThemes(): string[] {
    return this.rounds.flatMap(round => round.themes.map(theme => theme.name))
  }

  public setCurrentQuestion(question: Question | null): void {
    this._currentQuestion = question
  }

  // false on the last round
  public nextRound(): boolean {
    if (this.isLastRound) {
      return false
    }

    this._roundIndex += 1
    this._currentQuestion = null
    return true
  }

  // stays on the first round when there is no previous one
  public previousRound(): void {
    this._roundIndex = Math.max(0, this._roundIndex - 1)
    this._currentQuestion = null
  }

  // called when the pack is replaced or the game is closed
  public close(): void {
    this._currentQuestion = null
  }
}
