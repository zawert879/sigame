import { v4 as uuid } from 'uuid'

// Called after every change of a player. The game pushes the update: only it knows the queue position and the
// current selector, which are part of the player data sent to clients.
export type PlayerChangeListener = (player: Player) => void

export class Player {
  public readonly id = uuid()

  private _name = ''
  private _keyboardKey = ''
  private _winCount = 0
  private _loseCount = 0
  private _score = 0

  constructor(private readonly _onChange: PlayerChangeListener = () => undefined) {}

  public get name(): string {
    return this._name
  }

  public setName(value: string) {
    this._name = value
    this._onChange(this)
  }

  public setKeyboardKey(value: string) {
    this._keyboardKey = value
    this._onChange(this)
  }

  get winCount(): number {
    return this._winCount
  }

  get keyboardKey(): string {
    return this._keyboardKey
  }

  get loseCount(): number {
    return this._loseCount
  }

  get score(): number {
    return this._score
  }

  public win(value: number) {
    this._winCount += 1
    this._score += value
    this._onChange(this)
  }

  public lose(value: number) {
    this._loseCount += 1
    this._score -= value
    this._onChange(this)
  }

  public setLose(value: number) {
    this._loseCount = value
    this._onChange(this)
  }

  public setWin(value: number) {
    this._winCount = value
    this._onChange(this)
  }

  public setScore(value: number) {
    this._score = value
    this._onChange(this)
  }
}
