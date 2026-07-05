import * as SIQ from '../serverTypes'
import { Round } from './Round'

import * as Data from '../data'
import type * as ServerTypes from '../serverTypes'
import fsSync from 'fs'
import fs from 'fs/promises'
import path from 'path'
import { GameContainer } from '../types'
import { GameEvent } from '../events'
import EventEmitter from 'eventemitter3'
import { bind } from 'bind-decorator'
import { Question } from './Question'
import iconv from 'iconv-lite'
export class SiqPackage {
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
  private _eventEmitter: EventEmitter

  public get currentQuestion(): Question | null {
    return this._currentQuestion
  }

  public get roundIndex(): number {
    return this._roundIndex
  }

  constructor(siq: SIQ.Data, gameContainer: GameContainer) {
    const siqContent = siq.content
    this._eventEmitter = gameContainer.eventEmitter
    this.tags = siqContent.package.tags ? siqContent.package.tags.tag : []

    this.comments = siqContent.package.info.comments ?? null
    this.authors = siqContent.package.info.authors?.author ?? null

    this.rounds = Array.isArray(siqContent.package.rounds.round)
      ? siqContent.package.rounds.round.map(round => new Round(round, gameContainer))
      : [new Round(siqContent.package.rounds.round, gameContainer)]
    this.name = siqContent.package.attributes.name ?? null
    this.version = siqContent.package.attributes.version ?? null
    this.id = siqContent.package.attributes.id ?? null
    this.restriction = siqContent.package.attributes.restriction ?? null
    this.date = siqContent.package.attributes.date ?? null
    this.publisher = siqContent.package.attributes.publisher ?? null
    this.difficulty = siqContent.package.attributes.difficulty ?? null
    this.logo = siqContent.package.attributes.logo ?? null
    this.language = siqContent.package.attributes.language ?? null
    this.xmlns = siqContent.package.attributes.xmlns ?? null

    void this.saveAssets(siq, gameContainer.id)
    this._eventEmitter.emit(GameEvent.StartScreensaver)
    this.sub()
  }

  public closeGame() {
    this.unSub()
  }

  public getCurrentRound() {
    return this.rounds[this._roundIndex]
  }

  public nextRound() {
    if (this.rounds.length > this._roundIndex + 1) {
      this._roundIndex += 1
      this._eventEmitter.emit(GameEvent.NextRound)
    }
  }

  public previousRound() {
    if (this._roundIndex - 1 < 0) {
      this._roundIndex = 0
      this._eventEmitter.emit(GameEvent.PreviousRound)
      return
    }

    this._roundIndex -= 1
    this._eventEmitter.emit(GameEvent.PreviousRound)
  }

  @bind
  private onOpenQuestion(question: Question) {
    this._currentQuestion = question
  }

  @bind
  private onCloseQuestion() {
    this._currentQuestion = null
    let isCloseAllQuestions = true
    for (const [_, question] of this.getCurrentRound().questionById) {
      if (question.isClose) {
        isCloseAllQuestions = false
        break
      }
    }

    if (isCloseAllQuestions) {
      this._eventEmitter.emit(GameEvent.StartResultsOnCloseAllQuestions)
    }
  }

  private sub() {
    this._eventEmitter.on(GameEvent.OpenQuestion, this.onOpenQuestion)
    this._eventEmitter.on(GameEvent.CloseQuestion, this.onCloseQuestion)
  }

  private unSub() {
    this._eventEmitter.off(GameEvent.OpenQuestion, this.onOpenQuestion)
    this._eventEmitter.off(GameEvent.CloseQuestion, this.onCloseQuestion)
  }

  private async saveAssets(siq: ServerTypes.Data, id: string) {
    if (!fsSync.existsSync(Data.packagesDir)) {
      await fs.mkdir(Data.packagesDir)
    }

    const packDir = path.join(Data.packagesDir, id)
    await fs.mkdir(path.join(packDir, 'Images'), {
      recursive: true,
    })
    await fs.mkdir(path.join(packDir, 'Audio'), {
      recursive: true,
    })
    await fs.mkdir(path.join(packDir, 'Video'), {
      recursive: true,
    })

    siq.images.forEach(async file => {
      await fs.writeFile(path.join(packDir, decodeURIComponent(file.entryName)), file.getData())
    })

    siq.audios.forEach(async file => {
      await fs.writeFile(path.join(packDir, decodeURIComponent(file.entryName)), file.getData())
    })

    siq.videos.forEach(async file => {
      await fs.writeFile(path.join(packDir, decodeURIComponent(file.entryName)), file.getData())
    })
  }
}
