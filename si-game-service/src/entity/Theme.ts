import { type SIQ } from '../serverTypes'
import { type GameContainer } from '../types'
import { Question } from './Question'

export class Theme {
  readonly questions: Question[]
  readonly comments: string | null
  readonly authors: string | null
  readonly name: string

  constructor(theme: SIQ.Content.Package.Round.Theme, gameContainer: GameContainer) {
    this.comments = theme.info?.comments ?? null
    this.authors = theme.info?.authors?.author ?? null
    this.name = theme.attributes.name

    this.questions = Array.isArray(theme.questions.question)
      ? theme.questions.question.map(question =>
        new Question(question, this.name, gameContainer),
      )
      : [new Question(theme.questions.question, this.name, gameContainer)]
  }
}
