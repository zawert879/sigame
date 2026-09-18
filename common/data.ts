// Shared runtime enums of the socket protocol. Imported by both apps:
// si-game-service/src/data.ts and si-game-admin-2/src/data.ts re-export this file.

export enum SystemEvent {
  Connection = 'connection',
  Connect = 'connect',
  Disconnect = 'disconnect',
}

export enum Screen {
  Initial = 'Initial',
  ThemeList = 'ThemeList',
  ThemeListInRound = 'ThemeListInRound',
  RoundName = 'RoundName',
  Table = 'Table',
  Question = 'Question',
  QuestionPreparation = 'QuestionPreparation',
  Screensaver = 'Screensaver',
  Results = 'Results',
}

export enum Event {
  NewGame = 'newGame',
  GetGames = 'getGames',
  GetGame = 'getGame',

  SelectGame = 'selectGame',
  SelectPack = 'selectPack',
  Exit = 'exit',
  Next = 'next',
  NextRound = 'nextRound',
  PreviousRound = 'previousRound',
  SelectQuestion = 'selectQuestion',
  RepeatQuestion = 'repeatQuestion',
  CancelQuestion = 'cancelQuestion',

  OnUpdatePlayers = 'onUpdatePlayers',
  OnUpdateMediaPlayer = 'onUpdateMediaPlayer',
  OnStartScreensaver = 'onStartScreensaver',
  OnStartQuestion = 'onStartQuestion',
  onStartQuestionPreparation = 'onStartQuestionPreparation',
  OnStartRoundName = 'onStartRoundName',
  OnStartTable = 'onStartTable',
  OnStartThemeList = 'onStartThemeList',
  OnStartThemeListInRound = 'onStartThemeListInRound',
  OnStartResults = 'onStartResults',
  OnUpdateScoreValue = 'onUpdateScoreValue',
  OnUpdateQuestionPage = 'onUpdateQuestionPage',
  OnExit = 'onExit',

  AddPlayer = 'addPlayer',
  RemovePlayer = 'removePlayer',
  UpdatePlayer = 'updatePlayer',
  GetPlayers = 'getPlayers',
  SelectPlayer = 'selectPlayer',
  WinPlayer = 'winPlayer',
  LosePlayer = 'losePlayer',
  SetScorePlayer = 'setScorePlayer',
  SetWinPlayer = 'setWinPlayer',
  SetLosePlayer = 'setLosePlayer',
  UpdateMediaPlayer = 'updateMediaPlayer',

  SetScoreValue = 'setScoreValue',
  GetSettings = 'getSettings',
  SetScoreLittle = 'setScoreLittle',
  SetScoreBig = 'setScoreBig',
  SubmitScoreBigPlus = 'submitScoreBigPlus',
  SubmitScoreBigMinus = 'submitScoreBigMinus',
  SubmitScoreLittlePlus = 'submitScoreLittlePlus',
  SubmitScoreLittleMinus = 'submitScoreLittleMinus',
  KeyPress = 'keyPress',
  SetVolumeSettings = 'setVolumeSettings',
}

export enum RoundType {
  DEFAULT = 'default',
  FINAL = 'final',
}

export enum QuestionType {
  STAKE = 'stake',
  SECRET = 'secret',
  SECRET_PUBLIC_PRICE = 'secretPublicPrice',
  SECRET_NO_QUESTION = 'secretNoQuestion',
  NO_RISC = 'noRisk',
  DEFAULT = 'default',
}

export enum QuestionAnswerType {
  DEFAULT = 'default',
  Group = 'group',
}

export enum Knows {
  AFTER = 'after',
  BEFORE = 'before',
  NEVER = 'never',
}

export enum CostType {
  ACCURATE = 'accurate',
  STEP = 'step',
  BETWEEN = 'between',
  MIN_OR_MAX_IN_ROUND = 'minOrMaxInRound',
}

export enum SelectionModeType {
  EXCEPT_CURRENT = 'exceptCurrent',
  ANY = 'any',
}

// Error codes sent back in an AckError (see common/types.ts).
export enum AckErrorCode {
  GameNotFound = 'GAME_NOT_FOUND',
  GameNotSelected = 'GAME_NOT_SELECTED',
  Unauthorized = 'UNAUTHORIZED',
  InvalidPayload = 'INVALID_PAYLOAD',
  Failed = 'FAILED',
}
