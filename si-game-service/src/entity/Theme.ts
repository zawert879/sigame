import { type SIQ } from '../serverTypes'
import { textOf, toArray } from '../utils/siqValue'
import { Question } from './Question'

export class Theme {
  readonly questions: Question[]
  readonly comments: string | null
  readonly authors: string | null
  readonly name: string

  constructor(theme: SIQ.Content.Package.Round.Theme) {
    this.comments = textOf(theme.info?.comments)
    this.authors = textOf(theme.info?.authors?.author)
    this.name = textOf(theme.attributes?.name) ?? ''

    this.questions = toArray(theme.questions?.question)
      .filter(question => typeof question === 'object' && question !== null)
      .map(question => new Question(question, this.name))
  }

  public get hasAvailableQuestions(): boolean {
    return this.questions.some(question => question.isAvailable)
  }
}
