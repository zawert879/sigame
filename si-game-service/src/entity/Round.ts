import { RoundType } from '../data'
import { type SIQ } from '../serverTypes'
import { type GameContainer } from '../types'
import { Theme } from './Theme'
import type { Question } from './Question'

export class Round {
  readonly themes: Theme[]
  readonly type: RoundType
  readonly name: string
  readonly sources: string | null
  readonly comments: string | null
  readonly questionById = new Map<string, Question>()

  constructor(round: SIQ.Content.Package.Round, gameContainer: GameContainer) {
    this.comments = round.info ? round.info.comments : null
    this.sources = round.info ? round.info.sources?.source ?? null : null
    this.name = round.attributes.name
    this.themes = Array.isArray(round.themes.theme)
      ? round.themes.theme.map(theme => new Theme(theme, gameContainer))
      : [new Theme(round.themes.theme, gameContainer)]
    this.type = round.attributes.type
      ? round.attributes.type
      : RoundType.DEFAULT

    for (const theme of this.themes) {
      for (const question of theme.questions) {
        this.questionById.set(question.id, question)
      }
    }
  }
}
