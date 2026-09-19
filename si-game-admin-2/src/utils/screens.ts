import { Screen } from '@/data'

const SCREEN_TITLES: Record<Screen, string> = {
  [Screen.Initial]: 'Подготовка игры',
  [Screen.Screensaver]: 'Заставка',
  [Screen.ThemeList]: 'Темы игры',
  [Screen.RoundName]: 'Название раунда',
  [Screen.ThemeListInRound]: 'Темы раунда',
  [Screen.Table]: 'Табло',
  [Screen.QuestionPreparation]: 'Подготовка вопроса',
  [Screen.Question]: 'Вопрос',
  [Screen.Results]: 'Итоги',
}

export const screenTitle = (screen: Screen | null): string => (screen ? SCREEN_TITLES[screen] ?? screen : '')
