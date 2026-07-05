import path from 'path'

export const siqDir = path.join(path.resolve('.'), 'siq')
export const packagesDir = path.join(path.resolve('.'), 'packages')

export enum SystemEvent {
  Connection = 'connection',
  Handshake = 'handshake',
  Disconnect = 'disconnect',
  GameEvent = 'gameEvent',
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
  SetState = 'setState', // not use
  SetReward = 'setReward', // not use
  Next = 'next',
  NextRound = 'nextRound', // not use
  PreviousRound = 'previousRound', // not use
  SelectQuestion = 'selectQuestion',
  CloseQuestion = 'closeQuestion', // not use
  OpenQuestion = 'openQuestion', // not use

  OnUpdateFullData = 'onUpdateFullData', // not use
  OnUpdateState = 'onUpdateState', // not use
  OnUpdatePlayers = 'onUpdatePlayers',
  OnUpdateMediaPlayer = 'onUpdateMediaPlayer', // not use
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
  UpdateMediaPlayer = 'updateMediaPlayer', // not use

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

export enum ScenarioType {
  DEFAULT = 'default',
  IMAGE = 'image',
  VIDEO = 'video',
  VOICE = 'voice',
  HTML = 'html',
  MARKER = 'marker',
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

export enum GameState {
  Init = 'init',
  StartGame = 'startGame',
  Table = 'table',
  Question = 'question',
}
