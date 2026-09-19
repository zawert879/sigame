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
- Пульт: адаптивная страница, sticky-шапка (меню, `screenTitle` из `utils/screens.ts`, прогресс). «Далее» — в строке действий под
  превью экрана (`admin/HostActions.tsx`, вариант E, выбран пользователем 2026-09-19 по макетам `docs/next-button-mockups.html`):
  на вопросе — отвечающий (первый в очереди), ✕/✓ с паузой от двойного тапа и «Далее» с подписью следующего шага
  («Показать ответ», «К табло», «Итоги раунда»…); на табло — подсказка; клавиша PageDown (`hooks/useNextKey.ts`, исключена из кнопок игроков); ≥1024px — контент
  слева, справа таблица игроков и цена; телефон — всё в столбик с прокруткой, компактные строки игроков (`AdminTable`),
  табло с горизонтальной прокруткой и липкой колонкой тем. Отладочный JSON-квадрат убран. Оранжевая отметка «выбирает
  вопрос» в таблице игроков скрыта на экране вопроса (пользователь считал её «зависшей»). Меню: «Раунд N из M», кнопки
  раундов блокируются на краях пака.
- Тексты UI русские; «Default» показывается как «Без названия»; склонения очков — `utils/utils.ts`.

## Клавиши-кнопки

`hooks/useKeyPress.tsx` шлёт `keyPress(e.key, e.code)` на любой странице, игнорируя поля ввода, автоповтор и шорткаты с
модификаторами (одиночные Ctrl/Alt/Cmd — кнопки). Хранится `code`, показывается `keyLabel` (`utils/keys.ts`).

## Медиа

`components/MediaPlayer.tsx` (react-player + media-chrome). Источник правды — состояние сервера в `store/game.ts` `media`
(`receivedAt` + `mediaPosition` экстраполирует позицию; смена страницы кладёт «свежее» {0, играет}). ТВ и пульт стартуют сами:
свежая страница — с 0 без перемотки, иначе перемотка к позиции сервера; пуши применяются с допуском 1 с. Пульт шлёт
updateMediaPlayer только при расхождении больше допуска или другом play/pause (иначе эхо-петля), звук пульта выключен по
умолчанию (`store/audio.ts`, localStorage `sigame.adminMediaMuted`, кнопка MediaMuteButton). Политика Chrome: звук — после
первого клика/клавиши, беззвучный автозапуск — только `<video>`. При NotAllowedError видео играет без звука, `soundLocked`
в `store/audio.ts`; `components/SoundUnlock.tsx` на ТВ показывает подсказку (и проверяет политику тихим WAV), на обеих
страницах по первому pointerup/keydown вне media-chrome шлёт unlockSound — плееры включают звук и догоняют сервер.
Заблокированный плеер пульта не сообщает паузу, а первое ▶ подхватывает текущую позицию ТВ. Естественный конец трека
(`media.ended`) не отправляется; «свежий» старт не сообщается только для первого play элемента. Снимок после реконнекта
рассылается смонтированным плеерам через `updateMediaPlayer`. Проверено headless-тестом
в двух политиках автозапуска (scratchpad сессии 2026-09-19, в репо не сохранён). Громкости применяются сразу. HTML-контент — `question/HtmlContent.tsx` в `sandbox=""` iframe
(`htmlFile` → `/api/files/<id>/Html/<name>`). Кнопка «На весь экран» на ТВ — Fullscreen API.

Сервер — [[dev-architecture]].
