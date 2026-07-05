
import { Game } from './Game'
import { clearPackage } from '../utils/clearPackages'

export class AppState {
  private _games = new Map<string, Game>()

  public get games(): Game[] {
    return [...this._games.values()]
  }

  findGame(gameId: string): Game | null {
    return this._games.get(gameId) ?? null
  }

  newGame(gameName: string): Game {
    const game = new Game(gameName)
    this._games.set(game.id, game)
    return game
  }

  closeGame(gameId: string) {
    if (this._games.has(gameId)) {
      const game = this._games.get(gameId)!
      game.closeGame()
      clearPackage(game.id)
      this._games.delete(game.id)
    }
  }
}
