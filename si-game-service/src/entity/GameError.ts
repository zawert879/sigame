// An expected, user-facing failure of a game action (unknown question, pack is loading, ...).
// It is sent to the client as AckError FAILED with this message and logged without a stack trace.
export class GameError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GameError'
  }
}
