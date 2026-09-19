---
name: dev-architecture
description: Архитектура сервера SI Game — Koa и SPA-fallback, socket-протокол с ack, Controller-таблица, admin-токен, домен Game→Question, экраны, порты
metadata:
  type: project
---

## HTTP (Koa, `si-game-service/src/app.ts`)

CORS → REST `/api` → раздача медиа `PACKAGES_DIR/<run>/…` на `/api/files` и `/files` с HTTP Range (`src/api/files.ts`) →
статика фронтенда (`FRONTEND_STATIC_DIR`) → SPA-fallback (`src/utils/pageRoutes.ts`): `/admin/<id>` → `admin.html`,
`/player/<id>` → `player.html`, прочие страницы → `index.html`; путь с расширением или `/_next/*` без файла → 404.
`app.ts` не слушает порт — это делает `index.ts` после `portGuard` (тесты вызывают `httpServer.listen(0)`).

REST: `POST /api/upload` (только `.siq`, basename, zip проверяется, temp-файлы удаляются всегда), `GET /api/packs`
(`PackInfo {name, file, isBroken}`, кэш по mtime/size), `DELETE /api/packs?file=`, `GET /api/health` (`{app:'sigame', version}`).
Upload/delete при заданном `ADMIN_TOKEN` требуют `x-admin-token` или `?token=` (`src/api/rest/requireAdmin.ts`, сравнение timing-safe в `src/auth.ts`).

## Socket-протокол

- Enum `Event`/`AckErrorCode` — `common/data.ts`, типы и `Dao` — `common/types.ts`. Handshake нет.
- На соединение — `Controller`; обработчики — таблица `[Event, handler]` в `Controller.handlers()`; обёртка `wrap()`:
  admin-проверка → zod (`src/schema.ts`, каждая схема `z.ZodType<RequestX>`) → выбранная игра → ack результата или
  `AckError {error: GAME_NOT_FOUND|GAME_NOT_SELECTED|UNAUTHORIZED|INVALID_PAYLOAD|FAILED}`. Отсутствующий callback допустим.
- Публичные без токена: getGames, getGame, selectGame, getPlayers, getSettings, keyPress.
- Пуши: `Controller._gameListeners` подписывается на события `Game` (`src/events.ts`) и шлёт в свой сокет:
  onStart* (payload из `Game.getScreenData()`), onUpdatePlayers, onUpdateScoreValue, onUpdateQuestionPage, onUpdateMediaPlayer,
  onUpdateSettings, onExit. selectGame переподписывает с предыдущей игры; Exit/disconnect — отписка.
- `selectPack` отвечает после распаковки медиа (клиентский таймаут 180 с).

### Добавить событие

`common/data.ts` → `common/types.ts` (+ `Dao`) → схема в `src/schema.ts` + строка в `Controller.handlers()` (пуш: `GameEvent` +
слушатель в `_gameListeners`) → метод в `si-game-admin-2/src/client/Client.ts` (пуш: обработчик в `useGameConnection` + action в `store/game.ts`).

## Домен (`src/entity/`)

- `AppState` — игры; при старте `Default`. `exit` закрывает игру и создаёт новую.
- `Game` — единственный владелец потока вопросов: `selectQuestion`, `next`, `repeatQuestion`, `cancelQuestion`, `nextRound`,
  `previousRound`, `winPlayer` (очки, сброс очереди и кнопок, переход к ответу), `losePlayer`; сам выставляет
  `SiqPackage.currentQuestion` и эмитит экраны синхронно. `loadPack` асинхронный: разбор → очистка папки медиа → распаковка →
  закрытие старого пака → сброс per-pack состояния (игроки и их очки остаются) → Screensaver. Параллельная загрузка отклоняется.
- `Question.isAvailable === true` — вопрос ещё не сыгран; вопрос с ценой < 0 помечается сыгранным при разборе.
- `GameProgress`, `pageIndex/pagesCount`, `isLastRound` считаются в домене.

## Экраны

```
Initial ─selectPack→ Screensaver ─next→ ThemeList ─next→ RoundName ─next→ ThemeListInRound ─next→ Table
Table ─selectQuestion→ [QuestionPreparation ─next→] Question ─next… последняя страница ─next→ Table
все вопросы раунда сыграны → Results ─next→ следующий раунд (на последнем раунде — no-op)
```
Финальный раунд: выбор темы убирает её, пока не останется одна — она открывается как обычный вопрос.
Кнопки игроков активны только на обычном вопросе; для спец-вопросов цену ставит ведущий.

## Запуск и порты (`src/index.ts`, `src/portGuard.ts`, `src/config.ts`)

Порт проверяется до `listen`; без явного `PORT` при занятом 4000: чужой SI Game (`/api/health`) → сообщение и выход 0, иначе
4001–4010, затем любой свободный. Данные: исходники — cwd; упакованный бинарник — `siq/` рядом с exe, иначе
`~/Library/Application Support/SIGame` / `%LOCALAPPDATA%\SIGame`. Медиа — `PACKAGES_DIR/run-<pid>-<uuid>/<gameId>/`,
чистятся только каталоги завершённых запусков (после успешного listen). Баннер: ссылка и QR для ТВ (без токена) и для ведущего
(`/admin/` + `?token=`), список других LAN-адресов (эвристика отсекает VPN/мосты ВМ).

Фронтенд — [[dev-frontend]]; формат паков — [[dev-siq-format]].
