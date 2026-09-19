import { CostType } from "@/data";
import { questionTypeDictionary } from "@/dictionary";

export function timeout(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const formatPageText = (text: unknown): string => {
  if (text === null || text === undefined) {
    return ''
  }
  return String(text).replace(/ё/g, 'е').replace(/Ё/g, 'Е')
}

export const costToString = (data: { minimum: number; maximum: number; step: number; type: CostType }): string => {
  if(data.type === CostType.ACCURATE){
    return `${data.minimum || data.maximum}`
  }
  if(data.type === CostType.BETWEEN){
    return `от ${data.minimum} до ${data.maximum}`
  }
  if(data.type === CostType.STEP){
    return `от ${data.minimum} до ${data.maximum}, с шагом ${data.step}`
  }
  if(data.type === CostType.MIN_OR_MAX_IN_ROUND){
    return 'минимум или максимум в раунде'
  }
  return ''
}

export function getLocalizedQuestionType(questionType: string): string {
  return questionTypeDictionary[questionType] || questionType;
}

export function convertToRoman(value: number) {
  return [
      { value: 1000, char: 'M' },
      { value: 900, char: 'CM' },
      { value: 500, char: 'D' },
      { value: 400, char: 'CD' },
      { value: 100, char: 'C' },
      { value: 90, char: 'XC' },
      { value: 50, char: 'L' },
      { value: 40, char: 'XL' },
      { value: 10, char: 'X' },
      { value: 9, char: 'IX' },
      { value: 5, char: 'V' },
      { value: 4, char: 'IV' },
      { value: 1, char: 'I' }
  ].reduce((result, currentValue) => {
      while (value >= currentValue.value) {
          result += currentValue.char;
          value -= currentValue.value;
      }

      return result;
  }, '');
}

export const pluralRu = (count: number, one: string, few: string, many: string): string => {
  if (!Number.isInteger(count)) {
    return few
  }
  const rest = Math.abs(count) % 100
  if (rest >= 11 && rest <= 14) {
    return many
  }
  const last = rest % 10
  if (last === 1) {
    return one
  }
  if (last >= 2 && last <= 4) {
    return few
  }
  return many
}

export const formatScore = (score: number): string => `${score} ${pluralRu(score, 'очко', 'очка', 'очков')}`

export const formatAnswerCounts = (win: number, lose: number): string =>
  `${win} ${pluralRu(win, 'правильный', 'правильных', 'правильных')} · ${lose} ${pluralRu(lose, 'неверный', 'неверных', 'неверных')}`

const SERVICE_DEFAULT_GAME_NAME = 'Default'

export const displayGameName = (name: string | null | undefined): string => {
  const trimmed = name?.trim() ?? ''
  return trimmed && trimmed !== SERVICE_DEFAULT_GAME_NAME ? trimmed : 'Без названия'
}
