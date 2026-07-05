import z from 'zod'

export const filesValidator = z.object({
  id: z.string(),
  type: z.union([z.literal('Images'), z.literal('Video'), z.literal('Audio')]),
  file: z.string(),
})
