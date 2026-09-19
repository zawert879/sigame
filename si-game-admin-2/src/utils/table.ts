import { RoundType } from "@/data"
import type { PayloadStartTable } from "@/types"

export const isRemovingFinalThemes = (table: PayloadStartTable): boolean =>
  table.type === RoundType.FINAL && table.themes.filter(theme => theme.questions.some(question => question.isAvailable)).length > 1
