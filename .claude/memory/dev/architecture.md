---
name: dev-architecture
description: Архитектура сервера SI Game — HTTP/Koa, socket-протокол, Controller, модель Game→SiqPackage→Round→Theme→Question, экранная state machine
metadata:
  type: project
---

## HTTP (Koa, `si-game-service/src/app.ts`)

Порядок middleware: `koaBody` (multipart, до 1 ГБ) → `ctx.appState` → CORS → REST-роутер `/api` →
статика `packages/` на `/api/files` и `/files` → статика фронтенда → **SPA-fallback**: GET-404 вне `/api` и
`/socket.io` отдаёт `<первый сегмент>.html` (например `/admin/<id>` → `admin.html`) или `index.html`.

REST (`src/api/rest/`): `POST /api/upload` (поле `file` → `siq/`), `GET /api/packs` (`[{name, file}]`),
`DELETE /api/packs?file=`, `GET /api/fatal` (убивает процесс — аудит S1).

## Socket-протокол

- Имена событий — enum `Event` в `src/data.ts` (**дубль** в `si-game-admin-2/src/data.ts`), типы — `common/types.ts`
  (`Dao` — discriminated union `{type, payload}`).
- На каждое соединение — новый `Socket` + `Controller` (`app.ts`). Клиент обязан сначала прислать `handshake`
  (иначе все обработчики молча игнорируют запросы), затем `selectGame(gameId)` — подписывает сокет на события игры.
- **Запросы** клиент шлёт через `emitWithAck`; сервер отвечает через callback. Если guard не прошёл
  (`_isConnect`/`_selectedGame`) — ack не вызывается и промис на клиенте висит.
- **Пуши** сервера — события `on*` (`onStartTable`, `onUpdatePlayers`, `onUpdateScoreValue`, …). Каждый
  `onStart*` отправляется только если `game.screen` совпадает с этим экраном; payload строит
  `Controller.getScreenPayload(screen, game)` — тот же код отдаёт снимок при `getGame` (восстановление после
  перезагрузки страницы). `Screen.Results` там не обработан (аудит B5).
- Рассылка — per-socket: каждый `Controller` сам подписан на `Game` и шлёт в свой сокет (rooms не используются).

### Добавить новое событие

1. Значение в enum `Event` — в **обоих** `data.ts`.
2. Request/Response/Payload-типы и ветка в `Dao` — `common/types.ts`.
3. Сервер: метод-обработчик с `@bind` в `Controller` + строка в `socketIoSub()`; для пуша — событие в `GameEvent`
   (`src/events.ts`), тип в `Game.Events`, подписка в `gameEventSub()` **и** `gameEventUnSub()`.
4. Клиент: метод в `si-game-admin-2/src/client/Client.ts` (`await this.preValidate()` + `socket.send`), подписки
   `client.socket.socketIo.on/off` в странице — в **обеих** копиях (`admin.tsx` и `admin/[id].tsx` и т. п.).

## Доменная модель (`src/entity/`)

- `AppState` — `Map<gameId, Game>`; при старте создаётся игра `Default`. `exit` закрывает текущую игру и
  создаёт новую `Default` (с новым id).
- `Game` — владеет **одним `EventEmitter` на игру** (передаётся всем сущностям как `GameContainer`), игроками,
  `Score` (текущая ставка + «малый/большой» шаг, по умолчанию 20/100), `QueuePlayers` (очередь нажавших кнопку),
  `MediaPlayer` (синхронизация видео/аудио), `Settings` (громкость), `screen`, `currentSelector` (кто выбирает вопрос).
- `SiqPackage` → `Round[]` → `Theme[]` → `Question[]` → `Page[]` (строит `PageBuilder`). Ассеты распаковываются
  в `packages/<gameId>/`. Формат — [[dev-siq-format]].
- `Question.isClose === true` означает **«ещё не сыгран»** (инверсия!), `close()` помечает вопрос сыгранным
  и эмитит `CloseQuestion`.
- Порядок подписчиков важен: `Game` подписан на `OpenQuestion` раньше `SiqPackage`, поэтому `Game` эмитит
  `StartQuestion` через `process.nextTick`, чтобы `package.currentQuestion` успел выставиться.

## Экранная state machine (`Game.next()` + обработчики событий)

```
Initial ──selectPack──▶ Screensaver ──next──▶ ThemeList (все темы пака, только в начале)
   ──next──▶ RoundName ──next──▶ ThemeListInRound ──next──▶ Table
Table ──selectQuestion──▶ [QuestionPreparation (тип ≠ default) ──next──▶] Question
Question ──next──▶ следующая страница … последняя ──next──▶ close() ──▶ Table
Table (все вопросы раунда сыграны) ──▶ Results ──next──▶ nextRound ──▶ RoundName …
```

- Страницы вопроса: вопрос → маркер (`isMarker`, граница «вопрос/ответ») → ответ. `winPlayer` прыгает на
  последнюю страницу (`goToAnswer`), начисляет `score.value`, делает игрока `currentSelector`; `losePlayer`
  списывает `score.value` и убирает игрока из очереди.
- Кнопки игроков (`_isButtonsActive`) включаются при открытии **обычного** вопроса и выключаются при закрытии;
  `keyPress` ищет игрока по `code`. Для спец-вопросов (через QuestionPreparation) кнопки не включаются и
  `score.value` не выставляется ценой — ведущий задаёт его вручную.
- Финальный раунд (`type="final"`): в таблице показываются названия тем; выбор темы «удаляет» её, пока не
  останется одна — она открывается как обычный вопрос.
- `selectPlayer` на Question ставит игрока в очередь, на Table/QuestionPreparation — делает выбирающим.

Фронтенд — [[dev-frontend]].
