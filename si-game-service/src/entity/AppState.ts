import { Game } from './Game'
import { removeGameMedia } from '../utils/packages'

export class AppState {
  private _games = new Map<string, Game>()

  public get games(): Game[] {
    return [...this._games.values()].filter(game => !game.isClosed)
  }

  findGame(gameId: string): Game | null {
    const game = this._games.get(gameId)
    return game && !game.isClosed ? game : null
  }

  newGame(gameName: string): Game {
    const game = new Game(gameName)
    this._games.set(game.id, game)
    return game
  }

  // The game leaves the list before anything else happens, so it is never found again even when a later step fails.
  // Resolves once its media are removed; that never fails (a directory that cannot be removed is logged and removed
  // at a later start, see utils/packages.ts).
  async closeGame(gameId: string): Promise<void> {
    const game = this._games.get(gameId)
    if (!game) {
      return
    }

    this._games.delete(gameId)
    try {
      game.closeGame()
    } finally {
      await removeGameMedia(game.id)
    }
  }
}
