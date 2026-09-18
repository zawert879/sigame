import { RoundType } from '../data'
import { type SIQ } from '../serverTypes'
import { textOf, toArray } from '../utils/siqValue'
import { Theme } from './Theme'
import type { Question } from './Question'

export class Round {
  readonly themes: Theme[]
  readonly type: RoundType
  readonly name: string
  readonly sources: string | null
  readonly comments: string | null
  readonly questionById = new Map<string, Question>()

  constructor(round: SIQ.Content.Package.Round) {
    this.comments = textOf(round.info?.comments)
    this.sources = textOf(round.info?.sources?.source)
    this.name = textOf(round.attributes?.name) ?? ''
    this.type = round.attributes?.type === RoundType.FINAL ? RoundType.FINAL : RoundType.DEFAULT
    this.themes = toArray(round.themes?.theme)
      .filter(theme => typeof theme === 'object' && theme !== null)
      .map(theme => new Theme(theme))

    for (const theme of this.themes) {
      for (const question of theme.questions) {
        this.questionById.set(question.id, question)
      }
    }
  }

  public get questions(): Question[] {
    return [...this.questionById.values()]
  }

  public get hasAvailableQuestions(): boolean {
    return this.questions.some(question => question.isAvailable)
  }
}
