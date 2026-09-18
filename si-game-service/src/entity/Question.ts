import { v4 as uuid } from 'uuid'
import { CostType, QuestionAnswerType, QuestionType, SelectionModeType } from '../data'
import { type SIQ } from '../serverTypes'
import { type PageSnapshotType, type PayloadStartQuestion } from '../types'
import { numberOf, textList, textOf, toArray } from '../utils/siqValue'
import { type Page } from './Page'
import { PageBuilder } from './PageBuilder'

type QuestionData = SIQ.Content.Package.Round.Theme.Question
type Param = SIQ.Content.Package.Round.Theme.Question.Param
type ContentItem = SIQ.Content.Package.Round.Theme.Question.ContentItem
type ScenarioAtom = SIQ.Content.Package.Round.Theme.Question.ScenarioAtom
type SelectPrice = NonNullable<PayloadStartQuestion['selectPrice']>
type AnswerGroupItem = PayloadStartQuestion['answerGroup'][number]

// SIQ 5: <question type="...">
const siq5Types: Record<string, QuestionType> = {
  stake: QuestionType.STAKE,
  secret: QuestionType.SECRET,
  secretPublicPrice: QuestionType.SECRET_PUBLIC_PRICE,
  secretNoQuestion: QuestionType.SECRET_NO_QUESTION,
  noRisk: QuestionType.NO_RISC,
}

// SIQ 4: <type name="...">
const siq4Types: Record<string, QuestionType> = {
  cat: QuestionType.SECRET,
  bagcat: QuestionType.SECRET,
  auction: QuestionType.STAKE,
  sponsored: QuestionType.NO_RISC,
}

// SIQ 5 params that are known but do not affect pages
const passiveParams = new Set(['answerType', 'answerOptions', 'answerDeviation'])

const isObject = <T>(value: T): value is Exclude<T, string | number | boolean | null | undefined> =>
  typeof value === 'object' && value !== null

// SIQ 4 media reference: '@name' is a file of the pack, anything else is used as is (URL)
const mediaRef = (value: string): string => value.startsWith('@') ? value.slice(1) : value

export class Question {
  readonly id: string
  readonly comments: string | null
  readonly rightAnswer: string[] | null
  readonly wrongAnswer: string[] | null
  readonly price: number
  readonly type: QuestionType
  private readonly _answerGroup: AnswerGroupItem[] = []
  private _pages: Page[] | null = null
  private _pageIndex = 0
  private _selectPrice: SelectPrice | null = null

  private _themeName: string
  private _selectionMode: SelectionModeType | null = null
  private _isAvailable: boolean
  private _answerType: QuestionAnswerType = QuestionAnswerType.DEFAULT

  constructor(questionData: QuestionData, themeName: string) {
    this.id = uuid()
    this._themeName = themeName
    this.comments = textOf(questionData.info?.comments)

    const rightAnswer = textList(questionData.right?.answer)
    this.rightAnswer = rightAnswer.length > 0 ? rightAnswer : null
    const wrongAnswer = textList(questionData.wrong?.answer)
    this.wrongAnswer = wrongAnswer.length > 0 ? wrongAnswer : null

    this.price = numberOf(questionData.attributes?.price) ?? 0
    // A question with a negative price is not played: it is marked as played right away, without events
    this._isAvailable = this.price >= 0

    const params = toArray(questionData.params?.param).filter(param => isObject(param))
    if (params.length > 0) {
      // SIQ 5
      this.type = siq5Types[questionData.attributes?.type ?? ''] ?? QuestionType.DEFAULT
      this.parseAnswerGroup(params)
      this.parseParams(params)
      return
    }

    // SIQ 4 (or a question without content)
    if (isObject(questionData.type)) {
      this.type = siq4Types[questionData.type.attributes?.name ?? ''] ?? QuestionType.DEFAULT
      this.parseTypeParams(questionData.type)
    } else {
      this.type = siq5Types[questionData.attributes?.type ?? ''] ?? QuestionType.DEFAULT
    }

    const atoms = toArray(questionData.scenario?.atom)
    if (atoms.length > 0) {
      this.parseScenario(atoms)
    }
  }

  public get pages(): PageSnapshotType[] | null {
    return this._pages ? this._pages.map(page => page.snapshot) : null
  }

  public get pageIndex(): number {
    return this._pageIndex
  }

  public get pagesCount(): number {
    return this._pages?.length ?? 0
  }

  public get currentPage(): PageSnapshotType | null {
    return this._pages?.[this._pageIndex]?.snapshot ?? null
  }

  public get nextPage(): PageSnapshotType | null {
    return this._pages?.[this._pageIndex + 1]?.snapshot ?? null
  }

  public get selectPrice(): SelectPrice | null {
    return this._selectPrice
  }

  public get selectionMode(): SelectionModeType | null {
    return this._selectionMode
  }

  public get themeName(): string {
    return this._themeName
  }

  // true while the question has not been played yet
  public get isAvailable(): boolean {
    return this._isAvailable
  }

  public get answerType(): QuestionAnswerType {
    return this._answerType
  }

  public get answerGroup(): AnswerGroupItem[] {
    return this._answerGroup
  }

  // back to the first page (opening, repeating or cancelling the question)
  public restart(): void {
    this._pageIndex = 0
  }

  public markPlayed(): void {
    this._pageIndex = 0
    this._isAvailable = false
  }

  // false when the current page is the last one
  public goToNextPage(): boolean {
    if (this._pageIndex + 1 < this.pagesCount) {
      this._pageIndex += 1
      return true
    }

    return false
  }

  // Jump to the first page of the answer (the marker page; the answer may take several pages, the host goes through
  // them with next). Nothing changes while the answer is already shown. false when the page did not change.
  public goToAnswer(): boolean {
    const markerIndex = this._pages?.findIndex(page => page.isMarker) ?? -1
    const answerIndex = markerIndex >= 0 ? markerIndex : this.pagesCount - 1
    if (answerIndex <= this._pageIndex) {
      return false
    }

    this._pageIndex = answerIndex
    return true
  }

  private parseAnswerGroup(params: Param[]): void {
    for (const param of params) {
      if (param.attributes?.type !== 'group') {
        continue
      }

      for (const element of toArray(param.param)) {
        const variant = isObject(element) ? textOf(element.attributes?.name) : null
        const answer = isObject(element) ? this.parseAnswerGroupItem(element.item) : null
        if (variant === null || answer === null) {
          console.warn(`Вопрос "${this._themeName}" (${this.price}): пропущен некорректный вариант ответа`)
          continue
        }

        this._answerGroup.push({ answer, variant })
      }
    }

    if (this._answerGroup.length > 0) {
      this._answerType = QuestionAnswerType.Group
    }
  }

  private parseAnswerGroupItem(value: Param['item']): AnswerGroupItem['answer'] | null {
    const item = toArray(value)[0]
    const text = textOf(item)
    if (text === null) {
      return null
    }

    // an image option is sent as { '#text': <file> }, a text option as a plain string
    return isObject(item) && item.attributes?.type === 'image' ? { '#text': text } : text
  }

  private parseParams(params: Param[]) {
    const pageBuilder = new PageBuilder()
    let answer: Param | null = null
    for (const param of params) {
      const name = param.attributes?.name ?? ''
      if (param.attributes?.type === 'group') {
        // answer options, see parseAnswerGroup
        continue
      }

      switch (name) {
        case 'theme': {
          this._themeName = textOf(param['#text']) ?? this._themeName
          break
        }

        case 'question': {
          this.fillPages(param.item, pageBuilder)
          break
        }

        case 'answer': {
          if (answer !== null) {
            console.warn(`Вопрос "${this._themeName}" (${this.price}): несколько параметров answer, используется последний`)
          }

          answer = param
          break
        }

        case 'selectionMode': {
          this._selectionMode = textOf(param['#text']) === SelectionModeType.EXCEPT_CURRENT
            ? SelectionModeType.EXCEPT_CURRENT
            : SelectionModeType.ANY
          break
        }

        case 'price': {
          this._selectPrice = this.parseNumberSet(param) ?? this._selectPrice
          break
        }

        default: {
          if (!passiveParams.has(name)) {
            console.warn(`Вопрос "${this._themeName}" (${this.price}): неизвестный параметр "${name}"`)
          }
        }
      }
    }

    const answerParam: Param | null = answer
    this.finishPages(pageBuilder, answerParam ? () => this.fillPages(answerParam.item, pageBuilder) : null)
  }

  private parseNumberSet(param: Param): SelectPrice | null {
    const attributes = param.numberSet?.attributes
    if (!attributes) {
      return null
    }

    const minimum = numberOf(attributes.minimum) ?? 0
    const maximum = numberOf(attributes.maximum) ?? 0
    const step = numberOf(attributes.step) ?? 0

    let type = CostType.MIN_OR_MAX_IN_ROUND
    if (maximum === 0 && minimum === 0 && step === 0) {
      type = CostType.MIN_OR_MAX_IN_ROUND
    } else if (maximum === minimum && step === 0) {
      type = CostType.ACCURATE
    } else if (maximum > 0 && minimum > 0 && step === 0) {
      type = CostType.BETWEEN
    } else if (maximum > 0 && minimum > 0 && step > 0) {
      type = CostType.STEP
    }

    return { minimum, maximum, step, type }
  }

  // SIQ 4 <type name="..."><param name="theme|cost|self|knows">
  private parseTypeParams(type: NonNullable<QuestionData['type']>) {
    for (const param of toArray(type.param)) {
      if (!isObject(param)) {
        continue
      }

      const value = textOf(param['#text'])
      switch (param.attributes?.name) {
        case 'theme': {
          if (value) {
            this._themeName = value
          }

          break
        }

        case 'cost': {
          const cost = numberOf(value)
          if (cost !== null && cost > 0) {
            this._selectPrice = { minimum: cost, maximum: cost, step: 0, type: CostType.ACCURATE }
          } else if (cost === 0) {
            // bagcat: 0 means "minimum or maximum of the round"
            this._selectPrice = { minimum: 0, maximum: 0, step: 0, type: CostType.MIN_OR_MAX_IN_ROUND }
          }

          break
        }

        case 'self': {
          this._selectionMode = value === 'true' ? SelectionModeType.ANY : SelectionModeType.EXCEPT_CURRENT
          break
        }

        default: {
          break
        }
      }
    }

    if (type.attributes?.name === 'cat' && this._selectionMode === null) {
      this._selectionMode = SelectionModeType.EXCEPT_CURRENT
    }
  }

  // SIQ 4 <scenario><atom type="...">: each atom is a page, 'marker' separates the question from the answer
  private parseScenario(atoms: ScenarioAtom[]) {
    const pageBuilder = new PageBuilder()
    let hasMarker = false
    let answerItems = 0
    for (const atom of atoms) {
      const type = (isObject(atom) ? atom.attributes?.type : undefined) ?? 'text'
      if (type === 'marker') {
        if (!hasMarker) {
          hasMarker = true
          pageBuilder.endSection().setMarker(true)
        }

        continue
      }

      const text = textOf(atom)
      if (text === null || text === '') {
        continue
      }

      if (type === 'say') {
        // a replic is attached to the next page of the question / answer, or gets a page of its own
        pageBuilder.setReplic(text)
        continue
      }

      switch (type) {
        case 'image': {
          pageBuilder.setImage(mediaRef(text))
          break
        }

        case 'voice':
        case 'audio': {
          pageBuilder.setVoice(mediaRef(text))
          break
        }

        case 'video': {
          pageBuilder.setVideo(mediaRef(text))
          break
        }

        case 'html': {
          pageBuilder.setHtml(mediaRef(text))
          break
        }

        case 'text': {
          pageBuilder.setText(text)
          break
        }

        default: {
          console.warn(`Вопрос "${this._themeName}" (${this.price}): неизвестный тип atom "${type}"`)
          continue
        }
      }

      if (hasMarker) {
        answerItems += 1
      }

      pageBuilder.saveAndNextPage()
    }

    if (!hasMarker) {
      this.finishPages(pageBuilder, null)
      return
    }

    if (answerItems === 0 && this.rightAnswer) {
      pageBuilder.setText(this.rightAnswer[0])
    }

    this._pages = pageBuilder.finish()
  }

  // Marker page + answer: the answer content when given, otherwise the first right answer.
  // The marker flag is set on the first page of the answer.
  private finishPages(pageBuilder: PageBuilder, fillAnswer: (() => number) | null) {
    pageBuilder.endSection().setMarker(true)
    const answerItems = fillAnswer ? fillAnswer() : 0
    if (answerItems === 0 && this.rightAnswer) {
      pageBuilder.setText(this.rightAnswer[0])
    }

    this._pages = pageBuilder.finish()
  }

  // SIQ 5 content items; returns the number of items that produce visible content
  private fillPages(data: Param['item'], pageBuilder: PageBuilder): number {
    let count = 0
    for (const item of toArray<ContentItem>(data)) {
      const text = textOf(item)
      if (text === null || text === '') {
        continue
      }

      const attributes = isObject(item) ? item.attributes ?? {} : {}
      if (attributes.placement === 'replic') {
        // a replic is attached to the next page of the question / answer, or gets a page of its own
        pageBuilder.setReplic(text)
        continue
      }

      switch (attributes.type) {
        case 'image': {
          pageBuilder.setImage(text)
          break
        }

        case 'audio':
        case 'voice': {
          pageBuilder.setVoice(text)
          break
        }

        case 'video': {
          pageBuilder.setVideo(text)
          break
        }

        case 'html': {
          pageBuilder.setHtml(text)
          break
        }

        default: {
          pageBuilder.setText(text)
        }
      }

      count += 1
      // waitForFinish set → the item is shown together with the next one
      if (attributes.waitForFinish === undefined) {
        pageBuilder.saveAndNextPage()
      }
    }

    return count
  }
}
