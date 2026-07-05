import type EventEmitter from 'eventemitter3'

// export type Dao = import('@common/types').Dao
// export type EventExit = import('@common/types').EventExit
// export type EventStartQuestion = import('@common/types').EventStartQuestion
// export type EventStartResults = import('@common/types').EventStartResults
// export type EventStartRoundName = import('@common/types').EventStartRoundName
// export type EventStartScreensaver = import('@common/types').EventStartScreensaver
// export type EventStartTable = import('@common/types').EventStartTable
// export type EventStartThemeList = import('@common/types').EventStartThemeList
// export type EventStartThemeListInRound = import('@common/types').EventStartThemeListInRound
// export type EventUpdateMediaPlayer = import('@common/types').EventUpdateMediaPlayer
// export type EventUpdatePlayers = import('@common/types').EventUpdatePlayers
// export type EventUpdateQuestionPage = import('@common/types').EventUpdateQuestionPage
// export type EventUpdateScoreValue = import('@common/types').EventUpdateScoreValue
// export type PageSnapshotType = import('@common/types').PageSnapshotType
// export type PayloadQuestionPage = import('@common/types').PayloadQuestionPage
// export type PayloadStartQuestion = import('@common/types').PayloadStartQuestion
// export type PayloadStartResults = import('@common/types').PayloadStartResults
// export type PayloadStartRoundName = import('@common/types').PayloadStartRoundName
// export type PayloadStartScreensaver = import('@common/types').PayloadStartScreensaver
// export type PayloadStartTable = import('@common/types').PayloadStartTable
// export type PayloadStartThemeList = import('@common/types').PayloadStartThemeList
// export type PayloadStartThemeListInRound = import('@common/types').PayloadStartThemeListInRound
// export type Player = import('@common/types').Player
// export type RequestGetGame = import('@common/types').RequestGetGame
// export type RequestGetGames = import('@common/types').RequestGetGames
// export type RequestKeyPress = import('@common/types').RequestKeyPress
// export type RequestLosePlayer = import('@common/types').RequestLosePlayer
// export type RequestNewGame = import('@common/types').RequestNewGame
// export type RequestRemovePlayer = import('@common/types').RequestRemovePlayer
// export type RequestSelectGame = import('@common/types').RequestSelectGame
// export type RequestSelectPack = import('@common/types').RequestSelectPack
// export type RequestSelectPlayer = import('@common/types').RequestSelectPlayer
// export type RequestSelectQuestion = import('@common/types').RequestSelectQuestion
// export type RequestSetLosePlayer = import('@common/types').RequestSetLosePlayer
// export type RequestSetScoreBig = import('@common/types').RequestSetScoreBig
// export type RequestSetScoreLittle = import('@common/types').RequestSetScoreLittle
// export type RequestSetScorePlayer = import('@common/types').RequestSetScorePlayer
// export type RequestSetScoreValue = import('@common/types').RequestSetScoreValue
// export type RequestSetVolumeSettings = import('@common/types').RequestSetVolumeSettings
// export type RequestSetWinPlayer = import('@common/types').RequestSetWinPlayer
// export type RequestUpdateMediaPlayer = import('@common/types').RequestUpdateMediaPlayer
// export type RequestUpdatePlayer = import('@common/types').RequestUpdatePlayer
// export type RequestVoid = import('@common/types').RequestVoid
// export type RequestWinPlayer = import('@common/types').RequestWinPlayer
// export type ResponseGetGame = import('@common/types').ResponseGetGame
// export type ResponseGetGames = import('@common/types').ResponseGetGames
// export type ResponseGetPlayers = import('@common/types').ResponseGetPlayers
// export type ResponseGetSettings = import('@common/types').ResponseGetSettings
// export type ResponseNewGame = import('@common/types').ResponseNewGame
// export type ResponseVoid = import('@common/types').ResponseVoid
export * from '@common/types'
export type GameContainer = {
  id: string;
  eventEmitter: EventEmitter;
}