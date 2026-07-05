export class Timer {
  private _timerTime: number

  private _startWorkAtMs: number | null = null
  private _isDone = false

  private _timeoutId: NodeJS.Timeout | null = null
  private _cb: (() => void) | null

  constructor(ms: number, cb: () => void) {
    this._timerTime = ms
    this._cb = cb
    this.liquidateAndRunCallback = this.liquidateAndRunCallback.bind(this)
  }

  public get timerTime(): number {
    if (this._timerTime <= 0) {
      return 0
    }

    if (this._timeoutId) {
      const difference = Date.now() - (this._startWorkAtMs ?? 0)
      this._startWorkAtMs = Date.now()

      this._timerTime -= difference
      if (this._timerTime <= 0) {
        return 0
      }
    }

    return this._timerTime
  }

  public pause() {
    if (!this._timeoutId) {
      return
    }

    if (this._timeoutId) {
      const difference = Date.now() - (this._startWorkAtMs ?? 0)

      clearTimeout(this._timeoutId)

      this._timeoutId = null

      this._timerTime -= difference
    }

    if (this._timerTime < 0) {
      this.liquidateAndRunCallback?.()
    }
  }

  public startOrResume() {
    if (this._isDone) {
      return
    }

    if (this._cb) {
      this._timeoutId = setTimeout(this.liquidateAndRunCallback, this._timerTime)
      this._startWorkAtMs = Date.now()
    }
  }

  public cancel() {
    this._cb = null
    this._timerTime = 0
    this.liquidateAndRunCallback()
  }

  private liquidateAndRunCallback() {
    this._isDone = true
    if (this._timeoutId) {
      clearTimeout(this._timeoutId)
    }

    this._cb?.()
  }
}
