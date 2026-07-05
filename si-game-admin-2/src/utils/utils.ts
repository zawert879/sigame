import { CostType } from "@/data";
import { questionTypeDictionary } from "@/dictionary";

export function timeout(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
