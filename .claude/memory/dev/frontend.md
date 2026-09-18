---
name: dev-frontend
description: Устройство si-game-admin-2 — static export + SPA-fallback, дубли страниц, client-синглтон, клавиши-кнопки, синхронизация медиа, UI-конвенции
metadata:
  type: project
---

## Сборка и маршрутизация

- Next.js 14, **pages router**, `output: 'export'` → чистая статика в `out/`, которую раздаёт Koa-сервер.
  Серверного Next в проде нет (SSR, API routes, middleware, rewrites недоступны).
- Динамические маршруты не пререндерятся (`getStaticPaths` → `paths: []`). В проде `/admin/<id>` и
  `/player/<id>` обслуживает SPA-fallback Koa → `admin.html` / `player.html`, а id достаётся из
  `window.location.pathname` (`utils/route.ts`).
- Поэтому страницы **продублированы**: `pages/admin.tsx` (прод) ≈ `pages/admin/[id].tsx` (только `next dev`),
  то же для `player`. Любую правку делать в обеих копиях (аудит A2).
- `pages/index.tsx` — запрашивает список игр и редиректит на `/player/<первая игра>`.
- `/test`, `/test2`, `/test3` — песочницы, попадают в прод-сборку.

## Клиент и состояние

- `src/client/index.ts` — **синглтон** `client` поверх одного `Manager` socket.io (`serverUrl` из
  `NEXT_PUBLIC_SERVER_URL` или `window.location.origin`). `_app.tsx` один раз шлёт `handshake`.
- Каждая страница: `fetchGames()` → `client.getGame(id)` + `client.selectGame(id)` → раскладывает `screenData`
  по десятку `useState`; затем подписки `client.socket.socketIo.on(Event.On*)` в `useEffect`.
- `onUpdatePlayers` приходит дельтой (`added`/`removed`/`updated`) и сливается со списком вручную — в четырёх местах
  (admin, player, `GameInit`, `PlayerSettingsModal`), с мутацией объектов на месте.
- zustand используется только для списка паков (`store/packs.ts`).
- REST и медиа — по **относительным** URL (`/api/packs`, `/api/upload`, `/api/files/<gameId>/<Images|Audio|Video>/<name>`),
  сокет — по `serverUrl`.

## Кнопки игроков (клавиатура)

- `KeyPressProvider` (`hooks/useKeyPress.tsx`) в `_app` вешает глобальный `keydown` на **каждой** странице и шлёт
  `client.keyPress(e.key, e.code)`; сервер матчит по `code`.
- Чтобы ввод текста не жал «кнопки», поля ввода берутся из `components/override/` (`Input`, `InputNumber`,
  `InputSearch`) — они выключают провайдер на focus и включают на blur. **Не использовать antd-инпуты напрямую.**
- Назначение клавиши игроку — `onKeyDown` в `initial/PlayerList.tsx` сохраняет `e.code`.

## Медиа

- Актуальный плеер — `components/MediaPlayer.tsx` (react-player + media-chrome). Тип `Admin` — с контролами;
  play/pause/seek шлют `client.updateMediaPlayer({time, isPlaying})` → сервер → `onUpdateMediaPlayer` всем.
- Страница игрока пробрасывает `onUpdateMediaPlayer` в локальный `eventEmitter` (`src/eventEmitter.ts`), на который
  подписан `MediaPlayer` типа `Player`. Админка событие только логирует.
- `QuestionVideo`/`QuestionAudio`/`QuestionMediaPlayer` — старая реализация, не используется.
- Звуки игры (`public/MUSIC/*.mp3`) — `hooks/useSound.tsx` (`use-sound`).

## UI-конвенции

- antd 5 импортируется из `antd/lib` и `@ant-design/icons/lib` (так по всему коду; раздувает бандл — аудит F2).
- Tailwind 3 + antd одновременно (`postcss-antd-fixes`); кастомные анимации/цвета — `tailwind.config.ts`;
  шрифт Futura Condensed — `src/styles/fonts`.
- Тексты UI на русском, локализация типов вопросов — `src/dictionary.ts`.
- Экраны 1:1 соответствуют `Screen` из `data.ts`; админские версии — `components/admin/`, игровые —
  `components/player/`, общие — `components/`.

Сервер и протокол — [[dev-architecture]].
