import { Knows, QuestionType } from "./data";

export const knows = {
  [Knows.AFTER]: "До",
  [Knows.BEFORE]: "После",
  [Knows.NEVER]: "Никогда",
};

export const questionTypeDictionary: Record<string,string> = {
  [QuestionType.STAKE]: "Ставки",
  [QuestionType.SECRET]: "Кот в мешке",
  [QuestionType.SECRET_PUBLIC_PRICE]: "Кот в мешке",
  [QuestionType.SECRET_NO_QUESTION]: "Кот в мешке",
  [QuestionType.NO_RISC]: "Без риска",
  [QuestionType.DEFAULT]: "Обычный",
};
