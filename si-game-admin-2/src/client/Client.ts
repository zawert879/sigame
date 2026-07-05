import { Event } from "@/data";
import { Socket } from "./Socket";
import { RequestLosePlayer, RequestSelectPlayer, RequestSetLosePlayer, RequestSetScorePlayer, RequestSetWinPlayer, RequestUpdateMediaPlayer, RequestWinPlayer, ResponseGetGame, ResponseGetGames, ResponseGetPlayers, ResponseGetSettings, ResponseNewGame, ResponseVoid } from "@/types";
import { timeout } from "@/utils/utils";

export class Client {
  private _isConnected = false
  constructor(public readonly socket: Socket) { }

  public async handshake() {
    const result = await this.socket.handshake()
    this._isConnected = true
    return result
  }
  
  async selectPack(file: string) {
    await this.preValidate()
    await this.socket.send({
      type: Event.SelectPack,
      payload: {
        file
      }
    })
  }

  async selectGame(gameId: string) {
    await this.preValidate()
    await this.socket.send({
      type: Event.SelectGame,
      payload: {
        gameId
      }
    })
  }

  async newGame(gameName: string): Promise<ResponseNewGame> {
    await this.preValidate()
    return await this.socket.send<ResponseNewGame>({
      type: Event.NewGame,
      payload: {
        gameName
      }
    })
  }

  async getGames(): Promise<ResponseGetGames> {
    await this.preValidate()
    return await this.socket.send<ResponseGetGames>({
      type: Event.GetGames,
      payload: {}
    })
  }

  async getGame(gameId: string): Promise<ResponseGetGame> {
    await this.preValidate()
    return await this.socket.send<ResponseGetGame>({
      type: Event.GetGame,
      payload: {
        gameId
      }
    })
  }

  async getPlayers(): Promise<ResponseGetPlayers> {
    await this.preValidate()
    console.log('getPlayers')
    return await this.socket.send<ResponseGetPlayers>({
      type: Event.GetPlayers,
      payload: {}
    })
  }

  async keyPress(key: string, code: string): Promise<ResponseGetPlayers> {
    await this.preValidate()
    return await this.socket.send<ResponseGetPlayers>({
      type: Event.KeyPress,
      payload: {
        key,
        code
      }
    })
  }

  async setVolumeSettings(player: number, admin: number): Promise<ResponseVoid> {
    await this.preValidate()
    return await this.socket.send<ResponseVoid>({
      type: Event.SetVolumeSettings,
      payload: {
        player,
        admin
      }
    })
  }

  async addPlayer(): Promise<void> {
    await this.preValidate()
    return await this.socket.send<void>({
      type: Event.AddPlayer,
      payload: {}
    })
  }

  async next(): Promise<void> {
    await this.preValidate()
    return await this.socket.send<void>({
      type: Event.Next,
      payload: {}
    })
  }

  async exit(): Promise<void> {
    await this.preValidate()
    return await this.socket.send<void>({
      type: Event.Exit,
      payload: {}
    })
  }
  async updateMediaPlayer(data: RequestUpdateMediaPlayer): Promise<void> {
    await this.preValidate()
    return await this.socket.send<void>({
      type: Event.UpdateMediaPlayer,
      payload: data
    })
  }
  async nextRound(): Promise<void> {
    await this.preValidate()
    return await this.socket.send<void>({
      type: Event.NextRound,
      payload: {}
    })
  }
  async previousRound(): Promise<void> {
    await this.preValidate()
    return await this.socket.send<void>({
      type: Event.PreviousRound,
      payload: {}
    })
  }

  async removePlayer(playerId: string): Promise<void> {
    await this.preValidate()
    return await this.socket.send<void>({
      type: Event.RemovePlayer,
      payload: {
        playerId
      }
    })
  }
  async updatePlayer(playerId: string, name: string, keyboardKey?: string): Promise<void> {
    await this.preValidate()
    return await this.socket.send<void>({
      type: Event.UpdatePlayer,
      payload: {
        playerId,
        name,
        keyboardKey,
      }
    })
  }

  async selectQuestion(questionId: string): Promise<void> {
    await this.preValidate()
    return await this.socket.send<void>({
      type: Event.SelectQuestion,
      payload: {
        questionId
      }
    })
  }

  async setScoreValue(value: number): Promise<void> {
    await this.preValidate()
    return await this.socket.send<void>({
      type: Event.SetScoreValue,
      payload: {
        value,
      }
    })
  }
  async setScoreLittle(value: number): Promise<void> {
    await this.preValidate()
    return await this.socket.send<void>({
      type: Event.SetScoreLittle,
      payload: {
        value,
      }
    })
  }
  async setScoreBig(value: number): Promise<void> {
    await this.preValidate()
    return await this.socket.send<void>({
      type: Event.SetScoreBig,
      payload: {
        value
      }
    })
  }
  async submitScoreBigPlus(): Promise<void> {
    await this.preValidate()
    return await this.socket.send<void>({
      type: Event.SubmitScoreBigPlus,
      payload: {}
    })
  }
  async submitScoreBigMinus(): Promise<void> {
    await this.preValidate()
    return await this.socket.send<void>({
      type: Event.SubmitScoreBigMinus,
      payload: {}
    })
  }
  async submitScoreLittlePlus(): Promise<void> {
    await this.preValidate()
    return await this.socket.send<void>({
      type: Event.SubmitScoreLittlePlus,
      payload: {}
    })
  }
  async submitScoreLittleMinus(): Promise<void> {
    await this.preValidate()
    return await this.socket.send<void>({
      type: Event.SubmitScoreLittleMinus,
      payload: {}
    })
  }

  async getSettingsData(): Promise<ResponseGetSettings> {
    await this.preValidate()
    return await this.socket.send<ResponseGetSettings>({
      type: Event.GetSettings,
      payload: {}
    })
  }
  async winPlayer(playerId: string): Promise<RequestWinPlayer> {
    await this.preValidate()
    return await this.socket.send<RequestWinPlayer>({
      type: Event.WinPlayer,
      payload: {
        playerId
      }
    })
  }
  async losePlayer(playerId: string): Promise<RequestLosePlayer> {
    await this.preValidate()
    return await this.socket.send<RequestLosePlayer>({
      type: Event.LosePlayer,
      payload: {
        playerId
      }
    })
  }
  async setScorePlayer(playerId: string, value: number): Promise<RequestSetScorePlayer> {
    await this.preValidate()
    return await this.socket.send<RequestSetScorePlayer>({
      type: Event.SetScorePlayer,
      payload: {
        playerId,
        value
      }
    })
  }
  async selectPlayer(playerId: string): Promise<RequestSelectPlayer> {
    await this.preValidate()
    return await this.socket.send<RequestSelectPlayer>({
      type: Event.SelectPlayer,
      payload: {
        playerId
      }
    })
  }
  async setWinPlayer(playerId: string, value: number): Promise<RequestSetWinPlayer> {
    await this.preValidate()
    return await this.socket.send<RequestSetWinPlayer>({
      type: Event.SetWinPlayer,
      payload: {
        playerId,
        value
      }
    })
  }
  async setLosePlayer(playerId: string, value: number): Promise<RequestSetLosePlayer> {
    await this.preValidate()
    return await this.socket.send<RequestSetLosePlayer>({
      type: Event.SetLosePlayer,
      payload: {
        playerId,
        value
      }
    })
  }

  private async preValidate(){
    for (let i = 1; i < 100; i++) {
      if (this._isConnected) {
        break
      }
      await timeout(i * 50)
    }
    if (!this._isConnected) {
      new Error('Connection not established')
    }
  }
}
