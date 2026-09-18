import { z } from 'zod'
import type {
  RequestGetGame,
  RequestKeyPress,
  RequestLosePlayer,
  RequestNewGame,
  RequestRemovePlayer,
  RequestSelectGame,
  RequestSelectPack,
  RequestSelectPlayer,
  RequestSelectQuestion,
  RequestSetLosePlayer,
  RequestSetScoreBig,
  RequestSetScoreLittle,
  RequestSetScorePlayer,
  RequestSetScoreValue,
  RequestSetVolumeSettings,
  RequestSetWinPlayer,
  RequestUpdateMediaPlayer,
  RequestUpdatePlayer,
  RequestVoid,
  RequestWinPlayer,
} from './types'
import { isPackFileName } from './utils/packFiles'

// Validation of socket request payloads (common/types.ts Request*).
// Each schema is typed with its Request type, so the contract and the validation cannot drift apart.

const id = z.string().max(100)
const name = z.string().trim().max(200)
const finiteNumber = z.number().finite()
const volume = z.number().int().min(0).max(100)
const packFile = z.string().max(255).refine(isPackFileName, { message: 'Ожидается имя .siq-файла без пути' })

export const requestVoid: z.ZodType<RequestVoid> = z.object({})

export const requestGetGame: z.ZodType<RequestGetGame> = z.object({ gameId: id })
export const requestSelectGame: z.ZodType<RequestSelectGame> = z.object({ gameId: id })
export const requestNewGame: z.ZodType<RequestNewGame> = z.object({ gameName: name })
export const requestSelectPack: z.ZodType<RequestSelectPack> = z.object({ file: packFile })
export const requestSelectQuestion: z.ZodType<RequestSelectQuestion> = z.object({ questionId: id })

export const requestRemovePlayer: z.ZodType<RequestRemovePlayer> = z.object({ playerId: id })
export const requestUpdatePlayer: z.ZodType<RequestUpdatePlayer> = z.object({
  playerId: id,
  name,
  keyboardKey: z.string().max(64).optional(),
})
export const requestSelectPlayer: z.ZodType<RequestSelectPlayer> = z.object({ playerId: id })
export const requestWinPlayer: z.ZodType<RequestWinPlayer> = z.object({ playerId: id })
export const requestLosePlayer: z.ZodType<RequestLosePlayer> = z.object({ playerId: id })
export const requestSetScorePlayer: z.ZodType<RequestSetScorePlayer> = z.object({ playerId: id, value: finiteNumber })
export const requestSetWinPlayer: z.ZodType<RequestSetWinPlayer> = z.object({ playerId: id, value: finiteNumber })
export const requestSetLosePlayer: z.ZodType<RequestSetLosePlayer> = z.object({ playerId: id, value: finiteNumber })

export const requestSetScoreValue: z.ZodType<RequestSetScoreValue> = z.object({ value: finiteNumber })
export const requestSetScoreLittle: z.ZodType<RequestSetScoreLittle> = z.object({ value: finiteNumber })
export const requestSetScoreBig: z.ZodType<RequestSetScoreBig> = z.object({ value: finiteNumber })

export const requestKeyPress: z.ZodType<RequestKeyPress> = z.object({
  key: z.string().max(64),
  code: z.string().max(64),
})
export const requestUpdateMediaPlayer: z.ZodType<RequestUpdateMediaPlayer> = z.object({
  time: finiteNumber.min(0),
  isPlaying: z.boolean(),
})
export const requestSetVolumeSettings: z.ZodType<RequestSetVolumeSettings> = z.object({
  player: volume,
  admin: volume,
})
