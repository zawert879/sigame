import { type z } from 'zod'
import { AckErrorCode, Event, Screen, SystemEvent } from '../../data'
import type { AppState } from '../../entity/AppState'
import type { Game, GameListeners, ScreenData } from '../../entity/Game'
import { GameError } from '../../entity/GameError'
import { GameEvent } from '../../events'
import * as Schema from '../../schema'
import type { AckError, Dao, EventUpdatePlayers, ResponseGetGames, ResponseNewGame } from '../../types'
import { findPackFile } from '../../utils/packFiles'
import { type Socket } from './Socket'

// Thrown by a handler to answer with a specific AckError code
export class AckFailure extends Error {
  constructor(readonly code: AckErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'AckFailure'
  }
}

type Handler = {
  schema: z.ZodTypeAny;
  // public requests are allowed without the admin token
  isPublic: boolean;
  run: (payload: unknown) => unknown;
}

type Ack = (response: unknown) => void

const describeZodError = (error: z.ZodError): string => error.issues
  .map(issue => (issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message))
  .join('; ')

// push event for the current screen of a game
const screenDao = (screenData: ScreenData): Dao | null => {
  switch (screenData.screen) {
    case Screen.Screensaver: {
      return { type: Event.OnStartScreensaver, payload: { payload: screenData.payload } }
    }

    case Screen.ThemeList: {
      return { type: Event.OnStartThemeList, payload: { payload: screenData.payload } }
    }

    case Screen.RoundName: {
      return { type: Event.OnStartRoundName, payload: { payload: screenData.payload } }
    }

    case Screen.ThemeListInRound: {
      return { type: Event.OnStartThemeListInRound, payload: { payload: screenData.payload } }
    }

    case Screen.Table: {
      return { type: Event.OnStartTable, payload: { payload: screenData.payload } }
    }

    case Screen.QuestionPreparation: {
      return { type: Event.onStartQuestionPreparation, payload: { payload: screenData.payload } }
    }

    case Screen.Question: {
      return { type: Event.OnStartQuestion, payload: { payload: screenData.payload } }
    }

    case Screen.Results: {
      return { type: Event.OnStartResults, payload: { payload: screenData.payload } }
    }

    default: {
      return null
    }
  }
}

// One Controller per socket connection. Every request is acknowledged: the typed response ({} for void)
// or an AckError. Pushes of the selected game are forwarded to this socket only.
export class Controller {
  private _selectedGame: Game | null = null
  private readonly _gameListeners: GameListeners

  constructor(
    private readonly socket: Socket,
    private readonly appState: AppState,
    private readonly isAdmin = true,
  ) {
    this._gameListeners = {
      [GameEvent.UpdatePlayers]: data => {
        this.pushPlayers(data)
      },
      [GameEvent.QueuePlayersUpdated]: () => {
        this.pushQueue()
      },
      [GameEvent.UpdateScoreValue]: value => {
        this.send({ type: Event.OnUpdateScoreValue, payload: { scoreValue: value } })
      },
      [GameEvent.UpdatePage]: () => {
        this.pushPage()
      },
      [GameEvent.UpdateMediaPlayer]: data => {
        this.send({ type: Event.OnUpdateMediaPlayer, payload: data })
      },
      [GameEvent.Exit]: () => {
        this.onGameExit()
      },
      [GameEvent.StartScreensaver]: () => {
        this.pushScreen(Screen.Screensaver)
      },
      [GameEvent.StartThemeList]: () => {
        this.pushScreen(Screen.ThemeList)
      },
      [GameEvent.StartRoundName]: () => {
        this.pushScreen(Screen.RoundName)
      },
      [GameEvent.StartThemeListInRound]: () => {
        this.pushScreen(Screen.ThemeListInRound)
      },
      [GameEvent.StartTable]: () => {
        this.pushScreen(Screen.Table)
      },
      [GameEvent.StartQuestionPreparation]: () => {
        this.pushScreen(Screen.QuestionPreparation)
      },
      [GameEvent.StartQuestion]: () => {
        this.pushScreen(Screen.Question)
      },
      [GameEvent.StartResults]: () => {
        this.pushScreen(Screen.Results)
      },
    }

    for (const [event, handler] of this.handlers()) {
      this.socket.socketIo.on(event, this.wrap(event, handler))
    }

    this.socket.socketIo.on(SystemEvent.Disconnect, () => {
      this.disconnect()
    })
  }

  public get selectedGame(): Game | null {
    return this._selectedGame
  }

  public disconnect() {
    this.selectGameInstance(null)
  }

  // ---- request table ----

  private handlers(): Array<[Event, Handler]> {
    const isPublic = true
    return [
      // lobby
      [Event.GetGames, this.request(Schema.requestVoid, (): ResponseGetGames => this.appState.games.map(game => ({
        gameId: game.id,
        gameName: game.name,
        packageName: game.packageName,
      })), isPublic)],
      [Event.GetGame, this.request(Schema.requestGetGame, ({ gameId }) => this.findGame(gameId).getSnapshot(), isPublic)],
      [Event.SelectGame, this.request(Schema.requestSelectGame, ({ gameId }) => {
        this.selectGameInstance(this.findGame(gameId))
      }, isPublic)],
      [Event.NewGame, this.request(Schema.requestNewGame, ({ gameName }): ResponseNewGame => {
        const game = this.appState.newGame(gameName)
        return { gameId: game.id, gameName: game.name, packageName: game.packageName }
      })],

      // game flow
      [Event.SelectPack, this.gameRequest(Schema.requestSelectPack, async ({ file }, game) => {
        if (!await findPackFile(file)) {
          throw new AckFailure(AckErrorCode.Failed, `Пак ${file} не найден`)
        }

        await game.startGame(file)
      })],
      [Event.Next, this.gameRequest(Schema.requestVoid, (_, game) => {
        game.next()
      })],
      [Event.NextRound, this.gameRequest(Schema.requestVoid, (_, game) => {
        game.nextRound()
      })],
      [Event.PreviousRound, this.gameRequest(Schema.requestVoid, (_, game) => {
        game.previousRound()
      })],
      [Event.SelectQuestion, this.gameRequest(Schema.requestSelectQuestion, ({ questionId }, game) => {
        game.selectQuestion(questionId)
      })],
      [Event.RepeatQuestion, this.gameRequest(Schema.requestVoid, (_, game) => {
        game.repeatQuestion()
      })],
      [Event.CancelQuestion, this.gameRequest(Schema.requestVoid, (_, game) => {
        game.cancelQuestion()
      })],
      [Event.Exit, this.gameRequest(Schema.requestVoid, (_, game) => {
        // Every socket of the game receives onExit and drops its selection. The game is out of the list at once and
        // the Default game exists before any client asks for the games again; the media are removed in the background.
        void this.appState.closeGame(game.id)
        this.appState.newGame('Default')
      })],

      // players
      [Event.GetPlayers, this.gameRequest(Schema.requestVoid, (_, game) => game.playersWithQueue, isPublic)],
      [Event.AddPlayer, this.gameRequest(Schema.requestVoid, (_, game) => {
        game.addPlayer()
      })],
      [Event.RemovePlayer, this.gameRequest(Schema.requestRemovePlayer, ({ playerId }, game) => {
        game.removePlayer(playerId)
      })],
      [Event.UpdatePlayer, this.gameRequest(Schema.requestUpdatePlayer, ({ playerId, name, keyboardKey }, game) => {
        game.updatePlayer(playerId, name, keyboardKey)
      })],
      [Event.SelectPlayer, this.gameRequest(Schema.requestSelectPlayer, ({ playerId }, game) => {
        game.selectPlayer(playerId)
      })],
      [Event.WinPlayer, this.gameRequest(Schema.requestWinPlayer, ({ playerId }, game) => {
        game.winPlayer(playerId)
      })],
      [Event.LosePlayer, this.gameRequest(Schema.requestLosePlayer, ({ playerId }, game) => {
        game.losePlayer(playerId)
      })],
      [Event.SetScorePlayer, this.gameRequest(Schema.requestSetScorePlayer, ({ playerId, value }, game) => {
        game.getPlayer(playerId)?.setScore(value)
      })],
      [Event.SetWinPlayer, this.gameRequest(Schema.requestSetWinPlayer, ({ playerId, value }, game) => {
        game.getPlayer(playerId)?.setWin(value)
      })],
      [Event.SetLosePlayer, this.gameRequest(Schema.requestSetLosePlayer, ({ playerId, value }, game) => {
        game.getPlayer(playerId)?.setLose(value)
      })],
      [Event.KeyPress, this.gameRequest(Schema.requestKeyPress, ({ code }, game) => {
        game.playerUsedButton(code)
      }, isPublic)],

      // score and settings
      [Event.GetSettings, this.gameRequest(Schema.requestVoid, (_, game) => game.getSettings(), isPublic)],
      [Event.SetScoreValue, this.gameRequest(Schema.requestSetScoreValue, ({ value }, game) => {
        game.score.setValue(value)
      })],
      [Event.SetScoreLittle, this.gameRequest(Schema.requestSetScoreLittle, ({ value }, game) => {
        game.score.setLittle(value)
      })],
      [Event.SetScoreBig, this.gameRequest(Schema.requestSetScoreBig, ({ value }, game) => {
        game.score.setBig(value)
      })],
      [Event.SubmitScoreBigPlus, this.gameRequest(Schema.requestVoid, (_, game) => {
        game.score.bigPlus()
      })],
      [Event.SubmitScoreBigMinus, this.gameRequest(Schema.requestVoid, (_, game) => {
        game.score.bigMinus()
      })],
      [Event.SubmitScoreLittlePlus, this.gameRequest(Schema.requestVoid, (_, game) => {
        game.score.littlePlus()
      })],
      [Event.SubmitScoreLittleMinus, this.gameRequest(Schema.requestVoid, (_, game) => {
        game.score.littleMinus()
      })],
      [Event.UpdateMediaPlayer, this.gameRequest(Schema.requestUpdateMediaPlayer, ({ time, isPlaying }, game) => {
        game.mediaPlayer.update(time, isPlaying)
      })],
      [Event.SetVolumeSettings, this.gameRequest(Schema.requestSetVolumeSettings, ({ player, admin }, game) => {
        game.setting.playerVolume = player
        game.setting.adminVolume = admin
      })],
    ]
  }

  private request<S extends z.ZodTypeAny>(schema: S, run: (payload: z.output<S>) => unknown, isPublic = false): Handler {
    return { schema, isPublic, run: payload => run(payload as z.output<S>) }
  }

  // request scoped to the selected game (GAME_NOT_SELECTED without selectGame)
  private gameRequest<S extends z.ZodTypeAny>(schema: S, run: (payload: z.output<S>, game: Game) => unknown, isPublic = false): Handler {
    return { schema, isPublic, run: payload => run(payload as z.output<S>, this.requireGame()) }
  }

  // The single wrapper around every request: admin check → payload validation → handler (→ selected game check),
  // then ack with the result or an AckError. A client may emit without an ack callback.
  private wrap(event: Event, handler: Handler) {
    return async (...args: unknown[]): Promise<void> => {
      const ack = typeof args[args.length - 1] === 'function' ? args.pop() as Ack : null
      let response: unknown
      try {
        response = await this.handle(handler, args[0])
      } catch (error) {
        response = this.toAckError(event, error)
      }

      if (!ack) {
        return
      }

      try {
        ack(response)
      } catch (error) {
        console.error(`Не удалось отправить ответ на ${event}:`, error)
      }
    }
  }

  private async handle(handler: Handler, rawPayload: unknown): Promise<unknown> {
    if (!handler.isPublic && !this.isAdmin) {
      throw new AckFailure(AckErrorCode.Unauthorized, 'Нужен токен администратора')
    }

    const parsed = handler.schema.safeParse(rawPayload ?? {})
    if (!parsed.success) {
      throw new AckFailure(AckErrorCode.InvalidPayload, `Некорректные данные запроса: ${describeZodError(parsed.error)}`)
    }

    const result: unknown = await handler.run(parsed.data)
    return result ?? {}
  }

  private toAckError(event: Event, error: unknown): AckError {
    if (error instanceof AckFailure) {
      return { error: error.code, message: error.message }
    }

    if (error instanceof GameError) {
      console.warn(`${event}: ${error.message}`)
    } else {
      console.error(`Ошибка при обработке ${event}:`, error)
    }

    return {
      error: AckErrorCode.Failed,
      message: error instanceof Error ? error.message : String(error),
    }
  }

  private findGame(gameId: string): Game {
    const game = this.appState.findGame(gameId)
    if (!game) {
      throw new AckFailure(AckErrorCode.GameNotFound, 'Игра не найдена')
    }

    return game
  }

  private requireGame(): Game {
    if (!this._selectedGame || this._selectedGame.isClosed) {
      throw new AckFailure(AckErrorCode.GameNotSelected, 'Игра не выбрана')
    }

    return this._selectedGame
  }

  // switches the pushes of this socket to another game (null: none); selecting the same game again is a no-op
  private selectGameInstance(game: Game | null) {
    if (this._selectedGame === game) {
      return
    }

    this._selectedGame?.unsubscribe(this._gameListeners)
    this._selectedGame = game
    game?.subscribe(this._gameListeners)
  }

  // ---- pushes ----

  private send(dao: Dao) {
    try {
      this.socket.send(dao)
    } catch (error) {
      console.warn(`Не удалось отправить ${dao.type}:`, error)
    }
  }

  private onGameExit() {
    this.send({ type: Event.OnExit, payload: {} })
    this.selectGameInstance(null)
  }

  private pushPlayers(data: EventUpdatePlayers) {
    this.send({ type: Event.OnUpdatePlayers, payload: data })
  }

  private pushQueue() {
    const game = this._selectedGame
    if (!game) {
      return
    }

    this.send({
      type: Event.OnUpdatePlayers,
      payload: {
        added: [],
        removed: [],
        updated: game.playersWithQueue,
        currentSelector: game.currentSelector,
      },
    })
  }

  private pushPage() {
    const game = this._selectedGame
    if (!game) {
      return
    }

    this.send({ type: Event.OnUpdateQuestionPage, payload: { payload: game.getQuestionPagePayload() } })
  }

  // onStart<Screen> is sent only while the game is still on that screen
  private pushScreen(screen: Screen) {
    const game = this._selectedGame
    if (!game || game.screen !== screen) {
      return
    }

    const dao = screenDao(game.getScreenData())
    if (dao) {
      this.send(dao)
    }
  }
}
