---
name: dev-frontend
description: Устройство si-game-admin-2 — static export, клиент и реконнект, zustand-стор, вёрстка ТВ и пульта через FitText, кнопки-клавиши, медиа
metadata:
  type: project
---

## Сборка и маршруты

- Next 14.2 pages router, `output: 'export'` → `out/`, раздаёт Koa. `next.config.js`: `experimental.externalDir` (common/ вне
  приложения) и server-only webpack externals для `rc-*`/`@ant-design/*` `/es/` (иначе пререндер падает после ESM-импортов antd).
  `resolutions.classnames` в package.json — одна копия classnames для `next dev`.
- Страницы — тонкие обёртки без `getStaticProps`: `useRouteGameId('admin'|'player')` + `components/screens/AdminScreen|PlayerScreen`.
  `/`, `/admin/`, `/player/` → `FirstGameRedirect` на первую игру. Навигация между играми — полная перезагрузка страницы.
- `scripts/build.js` собирает фронт с `NEXT_PUBLIC_SERVER_URL=''` (dev-адрес из `.env*` не попадает в релиз).

## Клиент и состояние

- `src/client/` — синглтон `client`: `socket.timeout(ms).emitWithAck`, `AckError` → `RequestError` с русским текстом,
  после реконнекта сам повторяет `selectGame` и уведомляет подписчиков. Баннер «Нет соединения…» — `ConnectionBanner`.
- `src/config.ts` — `serverUrl` (нормализует адрес без протокола), admin-токен из `?token=` → localStorage `sigame.adminToken` →
  socket auth и заголовок `x-admin-token`. URL REST и медиа — только через `utils/api.ts` (`apiUrl`, `mediaUrl`, `authHeaders`).
- `store/game.ts` (zustand) — единственный источник состояния экрана; `store/players.ts` — слияние дельт onUpdatePlayers.
  `hooks/useGameConnection.ts` — selectGame + getGame, пуши применяются строго по порядку (1 с анимации выбора вопроса на ТВ),
  снимок перезагружается после реконнекта, громкость из onUpdateSettings.

## Вёрстка

- `components/FitText.tsx`: `FitText` — максимальный шрифт, влезающий в блок (сначала перенос по словам, внутри слов — только
  если заметно крупнее; ниже `min` — прокрутка); `useUniformFit(ref, selector)` — общий размер для группы (цены табло, варианты).
- ТВ: `PlayerScreen` — `fixed inset-0` flex-колонка: `PlayerPanel` (clamp по высоте, до 8 игроков) → `player/QuestionScore`
  (полосу не менять — решение пользователя) → `main` (flex-1, overflow-hidden), экраны `h-full`. Табло — CSS grid на все строки/
  столбцы без прокрутки (до 12×12). Вопрос: `question/Page.tsx` раскладывает текст/картинку/видео/аудио (`AudioVisual`, `VideoVisual`),
  варианты — `AnswerOptions`, реплика — подпись снизу. Итоги — пьедестал + ряды карточек. QR — тёмный на белом.
- Пульт: адаптивная страница, sticky-шапка (меню, `screenTitle` из `utils/screens.ts`, прогресс, «Далее»); ≥1024px — контент
  слева, справа таблица игроков и цена; телефон — всё в столбик с прокруткой, компактные строки игроков (`AdminTable`),
  табло с горизонтальной прокруткой и липкой колонкой тем. Отладочный JSON-квадрат убран.
- Тексты UI русские; «Default» показывается как «Без названия»; склонения очков — `utils/utils.ts`.

## Клавиши-кнопки

`hooks/useKeyPress.tsx` шлёт `keyPress(e.key, e.code)` на любой странице, игнорируя поля ввода, автоповтор и шорткаты с
модификаторами (одиночные Ctrl/Alt/Cmd — кнопки). Хранится `code`, показывается `keyLabel` (`utils/keys.ts`).

## Медиа

`components/MediaPlayer.tsx` (react-player + media-chrome): на пульте управление шлёт updateMediaPlayer, ТВ синхронизируется
через `src/eventEmitter.ts`; громкости применяются сразу. HTML-контент — `question/HtmlContent.tsx` в `sandbox=""` iframe
(`htmlFile` → `/api/files/<id>/Html/<name>`). Кнопка «На весь экран» на ТВ — Fullscreen API.

Сервер — [[dev-architecture]].
