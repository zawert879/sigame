import type { CostType, Event, QuestionAnswerType, QuestionType, RoundType, Screen, SelectionModeType } from '@common/data'

export type Dao = {
  type: Event.SelectPack;
  payload: RequestSelectPack;
} | {
  type: Event.GetGames;
  payload: {};
} | {
  type: Event.NewGame;
  payload: RequestNewGame;
} | {
  type: Event.GetGame;
  payload: RequestGetGame;
} | {
  type: Event.SelectGame;
  payload: RequestSelectGame;
} | {
  type: Event.AddPlayer;
  payload: RequestVoid;
} | {
  type: Event.RemovePlayer;
  payload: RequestRemovePlayer;
} | {
  type: Event.UpdatePlayer;
  payload: RequestUpdatePlayer;
} | {
  type: Event.GetPlayers;
  payload: RequestVoid;
} | {
  type: Event.OnUpdatePlayers;
  payload: EventUpdatePlayers;
} | {
  type: Event.OnStartScreensaver;
  payload: EventStartScreensaver;
} | {
  type: Event.OnStartQuestion;
  payload: EventStartQuestion;
} | {
  type: Event.onStartQuestionPreparation;
  payload: EventStartQuestion;
} | {
  type: Event.OnStartRoundName;
  payload: EventStartRoundName;
} | {
  type: Event.OnStartTable;
  payload: EventStartTable;
} | {
  type: Event.OnStartThemeList;
  payload: EventStartThemeList;
} | {
  type: Event.OnStartThemeListInRound;
  payload: EventStartThemeListInRound;
} | {
  type: Event.OnStartResults;
  payload: EventStartResults;
} | {
  type: Event.Next;
  payload: RequestVoid;
} | {
  type: Event.Exit;
  payload: RequestVoid;
} | {
  type: Event.SelectQuestion;
  payload: RequestSelectQuestion;
} | {
  type: Event.SetScoreValue;
  payload: RequestSetScoreValue;
} | {
  type: Event.SetScoreLittle;
  payload: RequestSetScoreLittle;
} | {
  type: Event.SetScoreBig;
  payload: RequestSetScoreBig;
} | {
  type: Event.SubmitScoreBigPlus;
  payload: RequestVoid;
} | {
  type: Event.SubmitScoreBigMinus;
  payload: RequestVoid;
} | {
  type: Event.SubmitScoreLittlePlus;
  payload: RequestVoid;
} | {
  type: Event.SubmitScoreLittleMinus;
  payload: RequestVoid;
} | {
  type: Event.OnUpdateScoreValue;
  payload: EventUpdateScoreValue;
} | {
  type: Event.GetSettings;
  payload: RequestVoid;
} | {
  type: Event.OnUpdateQuestionPage;
  payload: EventUpdateQuestionPage;
} | {
  type: Event.OnExit;
  payload: EventExit;
} | {
  type: Event.WinPlayer;
  payload: RequestWinPlayer;
} | {
  type: Event.SelectPlayer;
  payload: RequestSelectPlayer;
} | {
  type: Event.LosePlayer;
  payload: RequestLosePlayer;
} | {
  type: Event.SetScorePlayer;
  payload: RequestSetScorePlayer;
} | {
  type: Event.SetWinPlayer;
  payload: RequestSetWinPlayer;
} | {
  type: Event.SetLosePlayer;
  payload: RequestSetLosePlayer;
} | {
  type: Event.KeyPress;
  payload: RequestKeyPress;
} | {
  type: Event.NextRound;
  payload: RequestVoid;
} | {
  type: Event.PreviousRound;
  payload: RequestVoid;
} | {
  type: Event.UpdateMediaPlayer;
  payload: RequestUpdateMediaPlayer;
} | {
  type: Event.OnUpdateMediaPlayer;
  payload: EventUpdateMediaPlayer;
} | {
  type: Event.SetVolumeSettings;
  payload: RequestSetVolumeSettings;
}

export type RequestWinPlayer = {
  playerId: string;
}
export type RequestSelectPlayer = {
  playerId: string;
}

export type RequestLosePlayer = {
  playerId: string;
}

export type RequestSetScorePlayer = {
  playerId: string;
  value: number;
}

export type RequestSetWinPlayer = {
  playerId: string;
  value: number;
}

export type RequestSetLosePlayer = {
  playerId: string;
  value: number;
}
export type RequestUpdateMediaPlayer = {
  time: number;
  isPlaying: boolean;
}

export type RequestKeyPress = {
  key: string;
  code: string;
}

export type RequestSetVolumeSettings = {
  player: number;
  admin: number;
}

export type ResponseGetSettings = {
  little: number;
  big: number;
  scoreValue: number;
  playerVolume: number;
  adminVolume: number;
}
export type RequestSetScoreValue = {
  value: number;
}
export type RequestSetScoreLittle = {
  value: number;
}
export type RequestSetScoreBig = {
  value: number;
}
export type RequestSelectQuestion = {
  questionId: string;
}
export type RequestSelectPack = {
  file: string;
}

export type RequestGetGames = {
}

export type ResponseGetGames = Array<{
  gameId: string;
  gameName: string;
  packageName: string | null;
}>

export type RequestNewGame = {
  gameName: string;
}

export type ResponseNewGame = {
  gameId: string;
  gameName: string;
  packageName: string | null;
}

export type RequestGetGame = {
  gameId: string;
}

export type ResponseGetGame = {
  gameId: string;
  gameName: string;
  packageName: string | null;
  players: Player[];
  score: number;
  scoreBig: number;
  scoreLittle: number;
  screenData: {
    screen: Screen.Screensaver;
    payload: PayloadStartScreensaver;
  } | {
    payload: PayloadStartQuestion;
    screen: Screen.Question | Screen.QuestionPreparation;
  } | {
    payload: PayloadStartRoundName;
    screen: Screen.RoundName;
  } | {
    payload: PayloadStartTable;
    screen: Screen.Table;
  } | {
    payload: PayloadStartThemeList;
    screen: Screen.ThemeList;
  } | {
    payload: PayloadStartThemeListInRound;
    screen: Screen.ThemeListInRound;
  } | {
    screen: Screen.Initial;
    payload: PayloadInitial;
  };
}

export type RequestSelectGame = {
  gameId: string;
}

export type RequestRemovePlayer = {
  playerId: string;
}

export type RequestUpdatePlayer = {
  playerId: string;
  name: string;
  keyboardKey?: string;
}

export type RequestVoid = {}
export type ResponseVoid = {}
export type ResponseGetPlayers = Player[]

export type Player = {
  id: string;
  name: string;
  keyboardKey: string;
  queue: number | null;
  score: number;
  win: number;
  lose: number;
}

// events
export type EventUpdatePlayers = {
  added: Player[];
  removed: string[];
  updated: Player[];
  currentSelector: string | null;
}
export type EventStartScreensaver = {
  payload: PayloadStartScreensaver;
}
export type EventStartQuestion = {
  payload: PayloadStartQuestion;
}
export type EventStartRoundName = {
  payload: PayloadStartRoundName;
}
export type EventStartTable = {
  payload: PayloadStartTable;
}
export type EventStartThemeList = {
  payload: PayloadStartThemeList;
}
export type EventStartThemeListInRound = {
  payload: PayloadStartThemeListInRound;
}
export type EventStartResults = {
  payload: PayloadStartResults;
}
export type EventUpdateQuestionPage = {
  payload: PayloadQuestionPage;
}
export type PayloadQuestionPage = {
  currentPage: PageSnapshotType | null;
  nextPage: PageSnapshotType | null;
}
export type EventUpdateScoreValue = {
  scoreValue: number;
}
export type EventExit = {
}
export type EventUpdateMediaPlayer = {
  time: number;
  isPlaying: boolean;
}

// payloads
export type PayloadInitial = {}
export type PayloadStartScreensaver = {}
export type PayloadStartQuestion = {
  id: string;
  comments: string | null;
  currentPage: PageSnapshotType | null;
  nextPage: PageSnapshotType | null;
  isClose: boolean;
  price: number;
  rightAnswer: string[] | null;
  selectPrice: { minimum: number; maximum: number; step: number; type: CostType } | null;
  selectionMode: SelectionModeType | null;
  themeName: string;
  type: QuestionType;
  wrongAnswer: string[] | null;
  currentSelector: string | null;
  answerType: QuestionAnswerType;
  answerGroup: { answer: string | { ['#text']: string}, variant: string }[];
}
export type PayloadStartRoundName = {
  name: string;
}
export type PayloadStartTable = {
  type: RoundType;
  themes: Array<{
    name: string;
    questions: Array<{
      id: string;
      isClose: boolean;
      price: number;
    }>;
  }>;
  currentSelector: string | null;
}
export type PayloadStartThemeList = {
  themes: string[];
}
export type PayloadStartThemeListInRound = {
  themes: string[];
}
export type PayloadStartResults = {
  players: Player[];
}

export type PageSnapshotType = {
  text: string | null;
  replic: string | null;
  image: string | null;
  video: string | null;
  voice: string | null;
  html: string | null;
  isMarker: boolean;
}
