import bind from 'bind-decorator'
import { Event, RoundType, Screen } from '../../data'
import type { AppState } from '../../entity/AppState'
import { type Socket } from './Socket'
import { EventUpdateMediaPlayer, EventUpdatePlayers, PayloadStartQuestion, PayloadStartRoundName, PayloadStartScreensaver, PayloadStartTable, PayloadStartThemeList, PayloadStartThemeListInRound, RequestGetGame, RequestGetGames, RequestKeyPress, RequestLosePlayer, RequestNewGame, RequestRemovePlayer, RequestSelectGame, RequestSelectPack, RequestSelectPlayer, RequestSelectQuestion, RequestSetLosePlayer, RequestSetScoreBig, RequestSetScoreLittle, RequestSetScorePlayer, RequestSetScoreValue, RequestSetVolumeSettings, RequestSetWinPlayer, RequestUpdateMediaPlayer, RequestUpdatePlayer, RequestVoid, RequestWinPlayer, ResponseGetGame, ResponseGetGames, ResponseGetPlayers, ResponseGetSettings, ResponseNewGame, ResponseVoid } from '../../types'
import { Game } from '../../entity/Game'
import { GameEvent } from '../../events'

export class Controller {
  private _isConnect = false
  private _selectedGame: Game | null = null
  constructor(private readonly socket: Socket, private readonly appState: AppState) {
    console.log('connectToGame')

    this.socket.socketIo.on('disconnect', () => {
      if (this._selectedGame) {
        this.gameEventUnSub(this._selectedGame)
      }
    })
    this.socketIoSub(socket)
  }

  @bind
  public async connect(id: string) {
    this._isConnect = true
    console.log('connect', id, this.socket.id)
  }

  public disconnect() {
    this._isConnect = false
    console.log('disconnect')
  }

  @bind
  private async getGames(payload: RequestGetGames, cb: (response: ResponseGetGames) => void) {
    if (!this._isConnect) {
      return
    }

    try {
      cb(this.appState.games.map(game => ({
        gameId: game.id,
        gameName: game.name,
        packageName: game.package ? game.package.name : null,
      })))
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async getGame(payload: RequestGetGame, cb: (response: ResponseGetGame) => void) {
    if (!this._isConnect) {
      return
    }

    try {
      const game = this.appState.findGame(payload.gameId)
      if (game) {
        cb({
          gameId: game.id,
          gameName: game.name,
          packageName: game.package ? game.package.name : null,
          screenData: this.getScreenData(game),
          players: game.playersWithQueue,
          score: game.score.value,
          scoreBig: game.score.big,
          scoreLittle: game.score.little,
        })
      }
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async newGame(payload: RequestNewGame, cb: (response: ResponseNewGame) => void) {
    if (!this._isConnect) {
      return
    }

    try {
      const game = this.appState.newGame(payload.gameName)
      cb({
        gameId: game.id,
        gameName: game.name,
        packageName: game.package ? game.package.name : null,
      })
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async onGameUpdatePlayers(data: EventUpdatePlayers) {
    try {
      await this.socket.send({
        type: Event.OnUpdatePlayers,
        payload: {
          ...data,
          currentSelector: this._selectedGame?.currentSelector ?? null,
        },
      })
    } catch (error) {
      console.warn(error)
    }
  }

  @bind
  private async onQueuePlayersUpdated() {
    try {
      if (this._selectedGame) {
        await this.socket.send({
          type: Event.OnUpdatePlayers,
          payload: {
            added: [],
            removed: [],
            updated: this._selectedGame.playersWithQueue,
            currentSelector: this._selectedGame.currentSelector,
          },
        })
      }
    } catch (error) {
      console.warn(error)
    }
  }

  @bind
  private async onExit() {
    try {
      if (this._selectedGame) {
        await this.socket.send({
          type: Event.OnExit,
          payload: {},
        })
      }
    } catch (error) {
      console.warn(error)
    }
  }

  @bind
  private async onUpdateMediaPlayer(data: EventUpdateMediaPlayer) {
    try {
      if (this._selectedGame) {
        await this.socket.send({
          type: Event.OnUpdateMediaPlayer,
          payload: data,
        })
      }
    } catch (error) {
      console.warn(error)
    }
  }

  @bind
  private async onStartScreenSaver() {
    try {
      if (this._selectedGame?.package) {
        if (this._selectedGame.screen === Screen.Screensaver) {
          const data = this.getScreenPayload(this._selectedGame.screen, this._selectedGame).payload as PayloadStartScreensaver
          await this.socket.send({
            type: Event.OnStartScreensaver,
            payload: {
              payload: data,
            },
          })
        }
      }
    } catch (error) {
      console.warn(error)
    }
  }

  @bind
  private async onStartQuestion() {
    try {
      if (this._selectedGame?.package) {
        if (this._selectedGame.screen === Screen.Question) {
          const data = this.getScreenPayload(this._selectedGame.screen, this._selectedGame).payload as PayloadStartQuestion
          await this.socket.send({
            type: Event.OnStartQuestion,
            payload: {
              payload: data,
            },
          })
        }
      }
    } catch (error) {
      console.warn(error)
    }
  }

  @bind
  private async onStartQuestionPreparation() {
    try {
      if (this._selectedGame?.package) {
        if (this._selectedGame.screen === Screen.QuestionPreparation) {
          const data = this.getScreenPayload(this._selectedGame.screen, this._selectedGame).payload as PayloadStartQuestion
          await this.socket.send({
            type: Event.onStartQuestionPreparation,
            payload: {
              payload: data,
            },
          })
        }
      }
    } catch (error) {
      console.warn(error)
    }
  }

  @bind
  private async onStartRoundName() {
    try {
      if (this._selectedGame?.package) {
        if (this._selectedGame.screen === Screen.RoundName) {
          const data = this.getScreenPayload(this._selectedGame.screen, this._selectedGame).payload as PayloadStartRoundName
          await this.socket.send({
            type: Event.OnStartRoundName,
            payload: {
              payload: data,
            },
          })
        }
      }
    } catch (error) {
      console.warn(error)
    }
  }

  @bind
  private async onStartTable() {
    try {
      if (this._selectedGame?.package) {
        if (this._selectedGame.screen === Screen.Table) {
          console.log('onStartTable')
          const data = this.getScreenPayload(this._selectedGame.screen, this._selectedGame).payload as PayloadStartTable
          await this.socket.send({
            type: Event.OnStartTable,
            payload: {
              payload: data,
            },
          })
        }
      }
    } catch (error) {
      console.warn(error)
    }
  }

  @bind
  private async onStartThemeList() {
    try {
      if (this._selectedGame?.package) {
        if (this._selectedGame.screen === Screen.ThemeList) {
          const data = this.getScreenPayload(this._selectedGame.screen, this._selectedGame).payload as PayloadStartThemeList
          await this.socket.send({
            type: Event.OnStartThemeList,
            payload: {
              payload: data,
            },
          })
        }
      }
    } catch (error) {
      console.warn(error)
    }
  }

  @bind
  private async onStartThemeListInRound() {
    try {
      if (this._selectedGame?.package) {
        if (this._selectedGame.screen === Screen.ThemeListInRound) {
          const data = this.getScreenPayload(this._selectedGame.screen, this._selectedGame).payload as PayloadStartThemeListInRound
          await this.socket.send({
            type: Event.OnStartThemeListInRound,
            payload: {
              payload: data,
            },
          })
        }
      }
    } catch (error) {
      console.warn(error)
    }
  }

  @bind
  private async onStartResults() {
    try {
      if (this._selectedGame?.package) {
        if (this._selectedGame.screen === Screen.Results) {
          await this.socket.send({
            type: Event.OnStartResults,
            payload: {
              payload: {
                players: this._selectedGame.playersWithQueue,
              },
            },
          })
        }
      }
    } catch (error) {
      console.warn(error)
    }
  }

  @bind
  private async onUpdateScoreValue(value: number) {
    try {
      await this.socket.send({
        type: Event.OnUpdateScoreValue,
        payload: {
          scoreValue: value,
        },
      })
    } catch (error) {
      console.warn(error)
    }
  }

  @bind
  private async onUpdatePage() {
    try {
      if (this._selectedGame?.package) {
        await this.socket.send({
          type: Event.OnUpdateQuestionPage,
          payload: {
            payload: {
              currentPage: this._selectedGame.package.currentQuestion?.currentPage ?? null,
              nextPage: this._selectedGame.package.currentQuestion?.nextPage ?? null,
            },
          },
        })
      }
    } catch (error) {
      console.warn(error)
    }
  }

  @bind
  private async selectGame(payload: RequestSelectGame, cb: () => void) {
    if (!this._isConnect) {
      return
    }

    try {
      const game = this.appState.findGame(payload.gameId)
      this._selectedGame = game
      if (game) {
        this.gameEventUnSub(game)
        this.gameEventSub(game)
      }

      cb()
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async selectPack(payload: RequestSelectPack) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      this._selectedGame.startGame(payload.file)
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async getPlayers(_payload: RequestVoid, cb: (response: ResponseGetPlayers) => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      cb(this._selectedGame.playersWithQueue)
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async addPlayer(_payload: RequestVoid, cb: () => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      this._selectedGame.addPlayer()
      cb()
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async removePlayer(payload: RequestRemovePlayer, cb: () => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      this._selectedGame.removePlayer(payload.playerId)
      cb()
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async updatePlayer(payload: RequestUpdatePlayer, cb: () => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      const player = this._selectedGame.getPlayer(payload.playerId)
      player?.setName(payload.name)
      if (payload.keyboardKey) {
        player?.setKeyboardKey(payload.keyboardKey)
      }

      cb()
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async next(payload: RequestUpdatePlayer, cb: () => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      this._selectedGame.next()
      cb()
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async nextRound(payload: RequestUpdatePlayer, cb: () => void) {
    console.log('controller','nextRound')  
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      this._selectedGame.package?.nextRound()
      cb()
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async previousRound(payload: RequestUpdatePlayer, cb: () => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      this._selectedGame.package?.previousRound()
      cb()
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async exit(_payload: RequestVoid, cb: () => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      this.appState.closeGame(this._selectedGame.id)
      this.appState.newGame('Default')
      cb()
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async selectQuestion(payload: RequestSelectQuestion, cb: () => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      this._selectedGame.package?.getCurrentRound().questionById.get(payload.questionId)?.open()
      cb()
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async setScoreValue(payload: RequestSetScoreValue, cb: () => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      this._selectedGame.score.setValue(payload.value)
      cb()
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async setScoreLittle(payload: RequestSetScoreLittle, cb: () => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      this._selectedGame.score.setLittle(payload.value)
      cb()
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async setScoreBig(payload: RequestSetScoreBig, cb: () => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      this._selectedGame.score.setBig(payload.value)
      cb()
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async submitScoreBigPlus(payload: RequestVoid, cb: () => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      this._selectedGame.score.bigPlus()
      cb()
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async submitScoreBigMinus(payload: RequestVoid, cb: () => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      this._selectedGame.score.bigMinus()
      cb()
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async submitScoreLittlePlus(payload: RequestVoid, cb: () => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      this._selectedGame.score.littlePlus()
      cb()
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async submitScoreLittleMinus(payload: RequestVoid, cb: () => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      this._selectedGame.score.littleMinus()
      cb()
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async getSettings(payload: RequestVoid, cb: (response: ResponseGetSettings) => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      cb({
        scoreValue: this._selectedGame.score.value,
        big: this._selectedGame.score.big,
        little: this._selectedGame.score.little,
        adminVolume: this._selectedGame.setting.adminVolume,
        playerVolume: this._selectedGame.setting.playerVolume,
      })
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async winPlayer(payload: RequestWinPlayer, cb: (response: ResponseVoid) => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
        this._selectedGame.winPlayer(payload.playerId)
      cb({})
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async losePlayer(payload: RequestLosePlayer, cb: (response: ResponseVoid) => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      this._selectedGame.losePlayer(payload.playerId)
      cb({})
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async setScorePlayer(payload: RequestSetScorePlayer, cb: (response: ResponseVoid) => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      this._selectedGame.getPlayer(payload.playerId)?.setScore(payload.value)

      cb({})
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async setWinPlayer(payload: RequestSetWinPlayer, cb: (response: ResponseVoid) => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      this._selectedGame.getPlayer(payload.playerId)?.setWin(payload.value)
      cb({})
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async setLosePlayer(payload: RequestSetLosePlayer, cb: (response: ResponseVoid) => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      this._selectedGame.getPlayer(payload.playerId)?.setLose(payload.value)
      cb({})
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async keyPress(payload: RequestKeyPress, cb: () => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      this._selectedGame.playerUsedButton(payload.code)
      cb()
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async selectPlayer(payload: RequestSelectPlayer, cb: () => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      if(this._selectedGame.screen === Screen.Question) {
        this._selectedGame.selectPlayer(payload.playerId)
      }
      if(
        this._selectedGame.screen === Screen.QuestionPreparation
     || this._selectedGame.screen === Screen.Table
      ) {
        this._selectedGame.setCurrentSelector(payload.playerId)
      }
      cb()
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async updateMediaPlayer(payload: RequestUpdateMediaPlayer, cb: () => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      this._selectedGame.mediaPlayer.update(payload.time, payload.isPlaying)
      cb()
    } catch (error) {
      console.error(error)
    }
  }

  @bind
  private async setVolumeSettings(payload: RequestSetVolumeSettings, cb: () => void) {
    if (!this._isConnect) {
      return
    }

    if (!this._selectedGame) {
      return
    }

    try {
      this._selectedGame.setting.adminVolume = payload.admin
      this._selectedGame.setting.playerVolume = payload.player
      cb()
    } catch (error) {
      console.error(error)
    }
  }

  private getScreenData(game: Game): ResponseGetGame['screenData'] {
    return this.getScreenPayload(game.screen, game)
  }

  private getScreenPayload(screen: Screen, game: Game): ResponseGetGame['screenData'] {
    if (screen === Screen.Question || screen === Screen.QuestionPreparation) {
      if (game.package?.currentQuestion) {
        return {
          screen,
          payload: {
            id: game.package.currentQuestion.id,
            comments: game.package.currentQuestion.comments,
            currentPage: game.package.currentQuestion.currentPage,
            nextPage: game.package.currentQuestion.nextPage,
            isClose: game.package.currentQuestion.isClose,
            price: game.package.currentQuestion.price,
            rightAnswer: game.package.currentQuestion.rightAnswer,
            selectionMode: game.package.currentQuestion.selectionMode,
            selectPrice: game.package.currentQuestion.selectPrice,
            themeName: game.package.currentQuestion.themeName,
            type: game.package.currentQuestion.type,
            wrongAnswer: game.package.currentQuestion.wrongAnswer,
            currentSelector: game.currentSelector,
            answerGroup: game.package.currentQuestion.answerGroup,
            answerType: game.package.currentQuestion.answerType,
          },
        }
      }
    }

    if (screen === Screen.RoundName) {
      return {
        screen: Screen.RoundName,
        payload: {
          name: game.package?.getCurrentRound().name ?? '',
        },
      }
    }

    if (screen === Screen.Screensaver) {
      return {
        screen: Screen.Screensaver,
        payload: {},
      }
    }

    if (screen === Screen.Table) {
      return {
        screen: Screen.Table,
        payload: {
          type: game.package?.getCurrentRound().type ?? RoundType.DEFAULT,
          themes: game.package?.getCurrentRound().themes.map(t => ({
            name: t.name,
            questions: t.questions.map(q => ({
              id: q.id,
              isClose: q.isClose,
              price: q.price,
            })),
          })) ?? [],
          currentSelector: game.currentSelector,
        },
      }
    }

    if (screen === Screen.ThemeList) {
      return {
        screen: Screen.ThemeList,
        payload: {
          themes: game.getAllThemes(),
        },
      }
    }

    if (screen === Screen.ThemeListInRound) {
      return {
        screen: Screen.ThemeListInRound,
        payload: {
          themes: game.package?.getCurrentRound().themes.map(t => t.name) ?? [],
        },
      }
    }

    return {
      screen: Screen.Initial,
      payload: {},
    }
  }

  private socketIoSub(socket: Socket) {
    socket.socketIo.on(Event.SelectPack, this.selectPack)
    socket.socketIo.on(Event.GetGames, this.getGames)
    socket.socketIo.on(Event.GetGame, this.getGame)
    socket.socketIo.on(Event.NewGame, this.newGame)
    socket.socketIo.on(Event.SelectGame, this.selectGame)
    socket.socketIo.on(Event.GetPlayers, this.getPlayers)
    socket.socketIo.on(Event.AddPlayer, this.addPlayer)
    socket.socketIo.on(Event.RemovePlayer, this.removePlayer)
    socket.socketIo.on(Event.UpdatePlayer, this.updatePlayer)
    socket.socketIo.on(Event.Next, this.next)
    socket.socketIo.on(Event.NextRound, this.nextRound)
    socket.socketIo.on(Event.PreviousRound, this.previousRound)
    socket.socketIo.on(Event.Exit, this.exit)
    socket.socketIo.on(Event.SelectQuestion, this.selectQuestion)
    socket.socketIo.on(Event.SetScoreValue, this.setScoreValue)
    socket.socketIo.on(Event.SetScoreLittle, this.setScoreLittle)
    socket.socketIo.on(Event.SetScoreBig, this.setScoreBig)
    socket.socketIo.on(Event.SubmitScoreBigPlus, this.submitScoreBigPlus)
    socket.socketIo.on(Event.SubmitScoreBigMinus, this.submitScoreBigMinus)
    socket.socketIo.on(Event.SubmitScoreLittlePlus, this.submitScoreLittlePlus)
    socket.socketIo.on(Event.SubmitScoreLittleMinus, this.submitScoreLittleMinus)
    socket.socketIo.on(Event.GetSettings, this.getSettings)
    socket.socketIo.on(Event.WinPlayer, this.winPlayer)
    socket.socketIo.on(Event.LosePlayer, this.losePlayer)
    socket.socketIo.on(Event.SetScorePlayer, this.setScorePlayer)
    socket.socketIo.on(Event.SetWinPlayer, this.setWinPlayer)
    socket.socketIo.on(Event.SetLosePlayer, this.setLosePlayer)
    socket.socketIo.on(Event.KeyPress, this.keyPress)
    socket.socketIo.on(Event.SelectPlayer, this.selectPlayer)
    socket.socketIo.on(Event.UpdateMediaPlayer, this.updateMediaPlayer)
    socket.socketIo.on(Event.SetVolumeSettings, this.setVolumeSettings)
  }

  private gameEventSub(game: Game) {
    game.on(GameEvent.UpdatePlayers, this.onGameUpdatePlayers)
    game.on(GameEvent.StartScreensaver, this.onStartScreenSaver)
    game.on(GameEvent.StartQuestion, this.onStartQuestion)
    game.on(GameEvent.StartQuestionPreparation, this.onStartQuestionPreparation)
    game.on(GameEvent.StartRoundName, this.onStartRoundName)
    game.on(GameEvent.StartTable, this.onStartTable)
    game.on(GameEvent.StartThemeList, this.onStartThemeList)
    game.on(GameEvent.StartThemeListInRound, this.onStartThemeListInRound)
    game.on(GameEvent.StartResults, this.onStartResults)
    game.on(GameEvent.UpdateScoreValue, this.onUpdateScoreValue)
    game.on(GameEvent.UpdatePage, this.onUpdatePage)
    game.on(GameEvent.QueuePlayersUpdated, this.onQueuePlayersUpdated)
    game.on(GameEvent.Exit, this.onExit)
    game.on(GameEvent.UpdateMediaPlayer, this.onUpdateMediaPlayer)
  }

  private gameEventUnSub(game: Game) {
    game.off(GameEvent.UpdatePlayers, this.onGameUpdatePlayers)
    game.off(GameEvent.StartScreensaver, this.onStartScreenSaver)
    game.off(GameEvent.StartQuestion, this.onStartQuestion)
    game.off(GameEvent.StartQuestionPreparation, this.onStartQuestionPreparation)
    game.off(GameEvent.StartRoundName, this.onStartRoundName)
    game.off(GameEvent.StartTable, this.onStartTable)
    game.off(GameEvent.StartThemeList, this.onStartThemeList)
    game.off(GameEvent.StartThemeListInRound, this.onStartThemeListInRound)
    game.off(GameEvent.StartResults, this.onStartResults)
    game.off(GameEvent.UpdateScoreValue, this.onUpdateScoreValue)
    game.off(GameEvent.UpdatePage, this.onUpdatePage)
    game.off(GameEvent.QueuePlayersUpdated, this.onQueuePlayersUpdated)
    game.off(GameEvent.Exit, this.onExit)
    game.off(GameEvent.UpdateMediaPlayer, this.onUpdateMediaPlayer)
  }
}
