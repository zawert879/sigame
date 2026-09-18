import { Event, SystemEvent } from '../data'
import { DEFAULT_REQUEST_TIMEOUT, Socket } from './Socket'
import { ClientErrorCode, RequestError } from './errors'
import type {
  Dao,
  RequestUpdateMediaPlayer,
  ResponseGetGame,
  ResponseGetGames,
  ResponseGetPlayers,
  ResponseGetSettings,
  ResponseNewGame,
  ResponseVoid,
} from '../types'

// Big packs extract their assets before the server acknowledges selectPack.
const SELECT_PACK_TIMEOUT = 180_000
const KEY_PRESS_TIMEOUT = 5_000
const SERVER_DISCONNECT_RETRY_MS = 2_000

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

type Listener = () => void

export class Client {
  private status: ConnectionStatus
  private hasConnected: boolean
  private selectedGameId: string | null = null
  // re-selection of the game after a reconnect; requests wait for it
  private resync: Promise<void> | null = null
  private readonly statusListeners = new Set<Listener>()
  private readonly reconnectListeners = new Set<Listener>()

  constructor(public readonly socket: Socket) {
    const io = socket.socketIo
    this.hasConnected = io.connected
    this.status = io.connected ? 'connected' : 'connecting'
    io.on(SystemEvent.Connect, this.handleConnect)
    io.on(SystemEvent.Disconnect, this.handleDisconnect)
    io.on('connect_error', this.handleConnectError)
  }

  // --- connection state -------------------------------------------------------------------------------------------

  public getStatus = (): ConnectionStatus => this.status

  // id of the game this connection is subscribed to (re-selected automatically after reconnects)
  public get selectedGame(): string | null {
    return this.selectedGameId
  }

  public subscribeStatus = (listener: Listener): (() => void) => {
    this.statusListeners.add(listener)
    return () => {
      this.statusListeners.delete(listener)
    }
  }

  // Called after every reconnect, once the selected game has been re-selected: screens refetch their snapshot here.
  public onReconnect(listener: Listener): () => void {
    this.reconnectListeners.add(listener)
    return () => {
      this.reconnectListeners.delete(listener)
    }
  }

  // Subscribes to a server push event; returns the unsubscribe function.
  public on<T>(event: Event, handler: (payload: T) => void): () => void {
    this.socket.socketIo.on(event, handler)
    return () => {
      this.socket.socketIo.off(event, handler)
    }
  }

  private setStatus(status: ConnectionStatus) {
    if (this.status !== status) {
      this.status = status
      this.statusListeners.forEach(listener => listener())
    }
  }

  private handleConnect = () => {
    const isReconnect = this.hasConnected
    this.hasConnected = true
    this.setStatus('connected')
    if (!isReconnect) {
      return
    }
    // The server creates a fresh controller for every connection: select the game again.
    const gameId = this.selectedGameId
    const resync: Promise<void> = gameId
      ? this.socket.send<ResponseVoid>({ type: Event.SelectGame, payload: { gameId } }).then(
        () => undefined,
        () => {
          // not subscribed any more (game closed, timeout): the next selectGame() subscribes again
          if (this.selectedGameId === gameId) {
            this.selectedGameId = null
          }
        },
      )
      : Promise.resolve()
    this.resync = resync
    void resync.then(() => {
      if (this.resync === resync) {
        this.resync = null
      }
      this.reconnectListeners.forEach(listener => listener())
    })
  }

  private handleDisconnect = (reason: string) => {
    this.setStatus('disconnected')
    // socket.io reconnects by itself except after a server-side disconnect
    if (reason === 'io server disconnect') {
      setTimeout(() => {
        if (!this.socket.connected) {
          this.socket.socketIo.connect()
        }
      }, SERVER_DISCONNECT_RETRY_MS)
    }
  }

  private handleConnectError = () => {
    if (!this.socket.connected) {
      this.setStatus('disconnected')
    }
  }

  private waitForConnect(timeoutMs: number): Promise<void> {
    const io = this.socket.socketIo
    return new Promise((resolve, reject) => {
      const onConnect = () => {
        clearTimeout(timer)
        resolve()
      }
      const timer = setTimeout(() => {
        io.off(SystemEvent.Connect, onConnect)
        reject(new RequestError(ClientErrorCode.Disconnected))
      }, timeoutMs)
      io.once(SystemEvent.Connect, onConnect)
    })
  }

  private async request<T>(dao: Dao, timeoutMs: number = DEFAULT_REQUEST_TIMEOUT): Promise<T> {
    if (!this.socket.connected) {
      await this.waitForConnect(timeoutMs)
    }
    if (this.resync) {
      await this.resync
    }
    return this.socket.send<T>(dao, timeoutMs)
  }

  // --- games ------------------------------------------------------------------------------------------------------

  async getGames(): Promise<ResponseGetGames> {
    return this.request<ResponseGetGames>({ type: Event.GetGames, payload: {} })
  }

  async getGame(gameId: string): Promise<ResponseGetGame> {
    return this.request<ResponseGetGame>({ type: Event.GetGame, payload: { gameId } })
  }

  async newGame(gameName: string): Promise<ResponseNewGame> {
    return this.request<ResponseNewGame>({ type: Event.NewGame, payload: { gameName } })
  }

  // Subscribes this connection to the game's events; remembered and repeated after every reconnect.
  async selectGame(gameId: string): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.SelectGame, payload: { gameId } })
    this.selectedGameId = gameId
  }

  async selectPack(file: string): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.SelectPack, payload: { file } }, SELECT_PACK_TIMEOUT)
  }

  async exit(): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.Exit, payload: {} })
  }

  // --- game flow --------------------------------------------------------------------------------------------------

  async next(): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.Next, payload: {} })
  }

  async nextRound(): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.NextRound, payload: {} })
  }

  async previousRound(): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.PreviousRound, payload: {} })
  }

  async selectQuestion(questionId: string): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.SelectQuestion, payload: { questionId } })
  }

  async repeatQuestion(): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.RepeatQuestion, payload: {} })
  }

  async cancelQuestion(): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.CancelQuestion, payload: {} })
  }

  async updateMediaPlayer(data: RequestUpdateMediaPlayer): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.UpdateMediaPlayer, payload: data })
  }

  // Player buttons (keyboard). Fire-and-forget: dropped while offline or before a game is selected.
  keyPress(key: string, code: string): void {
    if (!this.socket.connected || !this.selectedGameId || this.resync) {
      return
    }
    this.socket.send<ResponseVoid>({ type: Event.KeyPress, payload: { key, code } }, KEY_PRESS_TIMEOUT).catch(() => undefined)
  }

  // --- players ----------------------------------------------------------------------------------------------------

  async getPlayers(): Promise<ResponseGetPlayers> {
    return this.request<ResponseGetPlayers>({ type: Event.GetPlayers, payload: {} })
  }

  async addPlayer(): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.AddPlayer, payload: {} })
  }

  async removePlayer(playerId: string): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.RemovePlayer, payload: { playerId } })
  }

  async updatePlayer(playerId: string, name: string, keyboardKey?: string): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.UpdatePlayer, payload: { playerId, name, keyboardKey } })
  }

  async selectPlayer(playerId: string): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.SelectPlayer, payload: { playerId } })
  }

  async winPlayer(playerId: string): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.WinPlayer, payload: { playerId } })
  }

  async losePlayer(playerId: string): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.LosePlayer, payload: { playerId } })
  }

  async setScorePlayer(playerId: string, value: number): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.SetScorePlayer, payload: { playerId, value } })
  }

  async setWinPlayer(playerId: string, value: number): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.SetWinPlayer, payload: { playerId, value } })
  }

  async setLosePlayer(playerId: string, value: number): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.SetLosePlayer, payload: { playerId, value } })
  }

  // --- score and settings -----------------------------------------------------------------------------------------

  async setScoreValue(value: number): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.SetScoreValue, payload: { value } })
  }

  async setScoreLittle(value: number): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.SetScoreLittle, payload: { value } })
  }

  async setScoreBig(value: number): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.SetScoreBig, payload: { value } })
  }

  async submitScoreBigPlus(): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.SubmitScoreBigPlus, payload: {} })
  }

  async submitScoreBigMinus(): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.SubmitScoreBigMinus, payload: {} })
  }

  async submitScoreLittlePlus(): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.SubmitScoreLittlePlus, payload: {} })
  }

  async submitScoreLittleMinus(): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.SubmitScoreLittleMinus, payload: {} })
  }

  async getSettingsData(): Promise<ResponseGetSettings> {
    return this.request<ResponseGetSettings>({ type: Event.GetSettings, payload: {} })
  }

  async setVolumeSettings(player: number, admin: number): Promise<void> {
    await this.request<ResponseVoid>({ type: Event.SetVolumeSettings, payload: { player, admin } })
  }
}
