import { CostType, SelectionModeType, QuestionType, QuestionAnswerType } from '../data'
import { type SIQ } from '../serverTypes'
import { v4 as uuid } from 'uuid'

import { type Page } from './Page'
import { PageBuilder } from './PageBuilder'
import { type GameContainer, type PageSnapshotType } from '../types'
import type EventEmitter from 'eventemitter3'
import { GameEvent } from '../events'

type ParamItem = string |
{
  '#text': string;
  attributes: {
    type: 'image' | 'audio' | 'video' | 'html';
    isRef?: 'True';
    waitForFinish: 'False';
    placement?: 'background' | 'replic';
    duration: string;
  };
}

export class Question {
  readonly id: string
  readonly comments: string | null
  readonly rightAnswer: string[] | null = null
  readonly wrongAnswer: string[] | null = null
  readonly price: number
  readonly type: QuestionType
  readonly _answerGroup: { answer: string, variant: string }[] = []
  private _pages: Page[] | null = null
  private _pageIndex = 0
  private _selectPrice: { minimum: number; maximum: number; step: number; type: CostType } | null = null

  private _themeName: string
  private _selectionMode: SelectionModeType | null = null
  private _isClose = true
  private _answerType: QuestionAnswerType = QuestionAnswerType.DEFAULT

  constructor(questionData: SIQ.Content.Package.Round.Theme.Question, themeName: string, gameContainer: GameContainer) {
    this.id = uuid()
    this._eventEmitter = gameContainer.eventEmitter
    this._themeName = themeName
    this.comments = questionData.info?.comments ?? null
    this.type = this.parseType(questionData.attributes.type)
    this.parseAnswerGroup(questionData)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    this.rightAnswer = questionData.right ? Array.isArray(questionData.right.answer) ? questionData.right.answer.map(a => a.toString()) : [questionData.right.answer.toString()] : null
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    this.wrongAnswer = questionData.wrong ? Array.isArray(questionData.wrong.answer) ? questionData.wrong.answer.map(a => a.toString()) : [questionData.wrong.answer.toString()] : null
    this.price = +questionData.attributes.price

    if (this.price < 0) {
      this.close()
    }

    const params = questionData.params ? Array.isArray(questionData.params.param) ? questionData.params.param : [questionData.params.param] : null
    if (params) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.parseParams(params)
    }

    // this.autoClose()
  }

  public get pages(): PageSnapshotType[] | null {
    return this._pages
  }

  public get currentPage(): PageSnapshotType | null {
    if (!this._pages) {
      return null
    }

    return this._pages[this._pageIndex].snapshot
  }

  public get nextPage(): PageSnapshotType | null {
    if (!this._pages) {
      return null
    }

    if (this._pages.length - 1 < this._pageIndex + 1) {
      return null
    }

    return this._pages[this._pageIndex + 1].snapshot
  }

  public get selectPrice(): { minimum: number; maximum: number; step: number; type: CostType } | null {
    return this._selectPrice
  }

  public get selectionMode(): SelectionModeType | null {
    return this._selectionMode
  }

  public get themeName(): string {
    return this._themeName
  }

  public get isClose(): boolean {
    return this._isClose
  }

  public get answerType(): QuestionAnswerType{
    return this._answerType
  }
  public get answerGroup(): { answer: string, variant: string }[] {
    return this._answerGroup
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  private _eventEmitter: EventEmitter

  public open() {
    if (!this.isClose) {
      return
    }

    this._pageIndex = 0

    console.log('open question')
    this._eventEmitter.emit(GameEvent.OpenQuestion, this)
  }

  public close() {
    if (!this.isClose) {
      return
    }

    this._pageIndex = 0
    this._isClose = false

    console.log('close question')
    this._eventEmitter.emit(GameEvent.CloseQuestion)
  }

  public goToAnswer() {
    if (this._pages) {
      this._pageIndex = this._pages.length - 1
      this._eventEmitter.emit(GameEvent.UpdatePage)
    }
  }

  public enter() {
    if (!this._pages) {
      this.close()
      return
    }

    if (this._pages.length > this._pageIndex + 1) {
      this._pageIndex += 1
      this._eventEmitter.emit(GameEvent.UpdatePage)
    } else {
      this.close()
    }
  }

  public back() {
    if (this.isClose) {
      return
    }

    this._isClose = true
  }

  private autoClose() {
    if (this._pages) {
      for (const page of this._pages) {
        if (page.video) {
          this.close()
        }

        if (page.voice) {
          this.close()
        }
      }
    }
  }

  private parseType(value: string | undefined): QuestionType {
    switch (value) {
      case 'stake': return QuestionType.STAKE
      case 'secret': return QuestionType.SECRET
      case 'secretPublicPrice': return QuestionType.SECRET_PUBLIC_PRICE
      case 'secretNoQuestion': return QuestionType.SECRET_NO_QUESTION
      case 'noRisk': return QuestionType.NO_RISC
      case 'default': return QuestionType.DEFAULT
      default: return QuestionType.DEFAULT
    }
  }

  private parseAnswerGroup(questionData: SIQ.Content.Package.Round.Theme.Question): void {
    if(Array.isArray(questionData.params?.param))
      for (const param of questionData.params?.param) {
        if(param.attributes.type === 'group'){
          this._answerType = QuestionAnswerType.Group
          for (const element of param.param) { 
            this._answerGroup.push({
              answer: element.item,
              variant: element.attributes.name,
            })
          }
        }
      }
  }

  // eslint-disable-next-line complexity
  private parseParams(params: Array<{ ['#text']?: string; item?: any[] | any; numberSet?: { attributes: { minimum: string; maximum: string; step: string } }; attributes: { name: string } }>) {
    const pageBuilder = new PageBuilder()
    let answer: any = null
    for (const param of params) {
      if (param.attributes.name === 'theme') {
        this._themeName = param['#text']!
      } else if (param.attributes.name === 'question') {
        this.fillPages(param.item, pageBuilder)
      } else if (param.attributes.name === 'answer') {
        if (answer !== null) {
          console.warn('parseParams, answer is exist')
        }

        answer = param
      } else if (param.attributes.name === 'selectionMode') {
        this._selectionMode = param['#text'] === 'exceptCurrent' ? SelectionModeType.EXCEPT_CURRENT : SelectionModeType.ANY
      } else if (param.attributes.name === 'price') {
        let type = CostType.MIN_OR_MAX_IN_ROUND
        if ((+param.numberSet!.attributes.maximum === 0 && +param.numberSet!.attributes.minimum === 0 && +param.numberSet!.attributes.step === 0)) {
          type = CostType.MIN_OR_MAX_IN_ROUND
        } else if (+param.numberSet!.attributes.maximum === +param.numberSet!.attributes.minimum && +param.numberSet!.attributes.step === 0) {
          type = CostType.ACCURATE
        } else if (+param.numberSet!.attributes.maximum > 0 && +param.numberSet!.attributes.minimum > 0 && +param.numberSet!.attributes.step === 0) {
          type = CostType.BETWEEN
        } else if (+param.numberSet!.attributes.maximum > 0 && +param.numberSet!.attributes.minimum > 0 && +param.numberSet!.attributes.step > 0) {
          type = CostType.STEP
        }

        this._selectPrice = {
          maximum: +param.numberSet!.attributes.maximum,
          minimum: +param.numberSet!.attributes.minimum,
          step: +param.numberSet!.attributes.step,
          type,
        }
      } else {
        console.warn('parseParams, params not parse')
      }
    }

    pageBuilder.saveAndNextPage().setMarker(true)
    if (answer) {
      this.fillPages(answer.item, pageBuilder)
    } else if (this.rightAnswer) {
      pageBuilder.setText(this.rightAnswer[0]).saveAndNextPage()
    }

    this._pages = pageBuilder.finish()
  }

  private fillPages(data: unknown | unknown[], pageBuilder: PageBuilder): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const items: ParamItem[] = Array.isArray(data) ? data : [data]
    for (const item of items) {
      if (typeof item === 'string' || typeof item === 'number') {
        pageBuilder.setText(item).saveAndNextPage()
      } else {
        let isText = true
        if (item.attributes.placement === 'replic') {
          isText = false
          pageBuilder.setReplic(item['#text'])
          console.log(items)
        }

        if (item.attributes.type === 'audio') {
          isText = false
          pageBuilder.setVoice(item['#text'])
        }

        if (item.attributes.type === 'video') {
          isText = false
          pageBuilder.setVideo(item['#text'])
        }

        if (item.attributes.type === 'image') {
          isText = false
          pageBuilder.setImage(item['#text'])
        }

        if (item.attributes.type === 'html') {
          isText = false
          pageBuilder.setHtml(item['#text'])
        }

        if (isText) {
          pageBuilder.setText(item['#text'])
        }

        if (item.attributes.waitForFinish === undefined) {
          pageBuilder.saveAndNextPage()
        }
      }
    }
  }
}

