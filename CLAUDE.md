# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Память проекта

Все файлы памяти хранятся в:

```
.claude/memory/
```

Перед началом работы читай корневой индекс:

```
.claude/memory/MEMORY.md
```

Он содержит ссылки на все категории:
- **project/** — обзор игры и репо, статус модулей
- **dev/** — команды и окружение, архитектура сервера и протокола, фронтенд, формат .siq
- **infra/** — CI и десктопные релизы (Windows + macOS)
- **plans/** — бэклог улучшений по аудиту, статусы задач
- **rules/** — жёсткие правила проекта, лучшие практики Claude Code

Аудит с file:line — `docs/AUDIT-2026-09-18.md`.

---

## Ключевые правила (подробнее в rules/global.md)

- Не читать `.env` файлы без явного разрешения
- Не добавлять комментарии в код (исходники, скрипты, конфиги, workflow). Служебные директивы (`eslint-disable…`, `@ts-expect-error`) — только когда без них не проходит линт/typecheck
- Не добавлять `Co-Authored-By` в коммиты
- Только zsh, никаких PowerShell-скриптов; скрипты сборки — на Node (`scripts/*.js`)
- Тег `v*` = публичный релиз (GitHub Release с exe и mac-бинарниками) — только по явной просьбе
- Рабочие документы (планы, аудиты, отчёты) — в `docs/` (кроме этого `CLAUDE.md` — он живёт в корне)

---

## Проект

Клон «Своей игры» (SIGame) для офлайн-игры в LAN: играет `.siq`-паки. Один Node-процесс отдаёт REST, socket.io
и собранный статический фронтенд (порт `PORT`, по умолчанию 4000). Поставка — только десктопные исполняемые
файлы (Windows exe, macOS arm64/x64); Docker-деплоя нет.

| Каталог | Стек | Назначение |
|---|---|---|
| `si-game-service/` | Koa 2, socket.io 4, zod, TS (commonjs), Jest | Игровой сервер; состояние игр только в памяти |
| `si-game-admin-2/` | Next.js 14.2 pages router, `output: 'export'`, antd 5, Tailwind 3, zustand | Весь UI: экран игроков `/player/<id>` и пульт ведущего `/admin/<id>` |
| `common/` | TS | `data.ts` — рантайм-enum'ы протокола, `types.ts` — типы запросов/ответов/пушей |

## Команды

Node **24** (root `engines`), Yarn **1 (classic)**. В корне нет зависимостей и workspaces — ставить в каждом приложении:
`yarn install --frozen-lockfile` в `si-game-service/` и в `si-game-admin-2/`.

```zsh
yarn build          # (корень) next export → tsc сервиса → копия si-game-admin-2/out в si-game-service/dist/public
yarn start          # (корень) собранный сервер
yarn package:win    # (корень) build + @yao-pkg/pkg → release/sigame.exe
yarn package:mac    # (корень) → release/sigame-macos-arm64|x64 (+ .tar.gz), ad-hoc codesign — только на macOS
yarn package:all
yarn smoke          # (корень) после build: поднимает сервер и проверяет страницы, ассеты, REST, socket.io

# si-game-service/
yarn dev            # node --watch + ts-node
yarn typecheck
yarn lint           # eslint 8 + xo, включая test/
yarn test           # jest; один файл: yarn test test/rest.test.ts; по имени: yarn test -t "<name>"

# si-game-admin-2/
yarn dev            # next dev :3000 + NEXT_PUBLIC_SERVER_URL=http://localhost:4000 в .env.local
yarn typecheck
yarn lint           # next lint
yarn build          # static export → out/
```

Проверка изменения: `yarn typecheck && yarn lint` в затронутом приложении, `yarn test` для сервиса,
`yarn build && yarn smoke` в корне (`yarn smoke <бинарник>` проверяет упакованный exe/mac-бинарник).
CI: `check.yml` — то же на PR; `build.yml` — check + упаковка Win/Mac в артефакты на каждый push; `release.yml` — релиз по тегу `v*`.

Env сервера: `PORT`, `ADMIN_TOKEN` (opt-in защита управления), `SIQ_DIR`, `PACKAGES_DIR`, `FRONTEND_STATIC_DIR`
(`si-game-service/src/config.ts`, читаются один раз при импорте). Упакованный бинарник по умолчанию хранит данные не в cwd,
а в `~/Library/Application Support/SIGame` / `%LOCALAPPDATA%\SIGame` (или `siq/` рядом с исполняемым файлом, если он там есть).

## Архитектура — что не видно из одного файла

- **Сборка.** Сервис компилирует и `../common`, поэтому точка входа — `dist/si-game-service/src/index.js`.
  Рантайм-импорты `common/data` — только относительным путём; `@common/types` — только `import type`.
  Во фронтенде `next.config.js` включает `experimental.externalDir` (common вне приложения) и server-only
  webpack externals для `rc-*`/`@ant-design/*` `/es/` (иначе падает пререндер после ESM-импортов antd).
- **Static export + SPA-fallback.** Koa отдаёт `/admin/<id>` → `admin.html`, `/player/<id>` → `player.html`
  (путь с расширением или `/_next/*` без файла → 404). Страницы — тонкие обёртки без `getStaticProps`: id берёт
  `useRouteGameId` (`utils/route.ts`), тело — `components/screens/AdminScreen.tsx` / `PlayerScreen.tsx`.
  `/`, `/admin/`, `/player/` без id редиректят на первую игру (`FirstGameRedirect`).
- **Протокол.** Без handshake. Клиент (`si-game-admin-2/src/client/`, синглтон `client`) шлёт `selectGame(id)`,
  запросы — `socket.timeout(ms).emitWithAck`; после реконнекта сам повторяет `selectGame`. Сервер создаёт
  `Controller` на соединение; **каждый** запрос получает ack — ответ или `AckError {error: AckErrorCode}`.
  Обработчики — таблица `[Event, handler]` в `Controller.handlers()`, общая обёртка делает admin-проверку,
  zod-валидацию (`src/schema.ts`), проверку выбранной игры и ack.
- **Admin-токен (opt-in).** При заданном `ADMIN_TOKEN` мутирующие события и `POST /api/upload`,
  `DELETE /api/packs` требуют токен (`socket.handshake.auth.token` / заголовок `x-admin-token`). Публичные:
  getGames, getGame, selectGame, getPlayers, getSettings, keyPress. Клиент берёт `?token=` из URL и хранит в localStorage.
- **Домен.** `Game` один управляет потоком вопросов (open/close/pages) и явно обновляет `SiqPackage.currentQuestion`
  перед пушем экрана — никаких двух подписчиков на одно событие и `process.nextTick`. Экраны:
  Screensaver → ThemeList → RoundName → ThemeListInRound → Table → [QuestionPreparation] → Question → Table → Results.
  Снимок для reload и payload пушей строит `Game.getScreenData()`. `Question.isAvailable === true` — вопрос ещё не сыгран.
- **Фронтенд-состояние.** Один zustand-store `store/game.ts` на экран; `hooks/useGameConnection.ts` делает
  `selectGame` + `getGame`, применяет пуши строго по порядку и перезагружает снимок после реконнекта.
  Дельты `onUpdatePlayers` сливает только `store/players.ts`.
- **Вёрстка.** Любой текст из пака или имени игрока выводится через `components/FitText.tsx` (подбирает шрифт под блок,
  ниже минимума — прокрутка); группы одинакового текста (цены табло, варианты ответа) — `useUniformFit`. ТВ: `PlayerScreen` —
  `fixed inset-0` flex-колонка (панель игроков → полоса цены → `main` на всю остаток), экраны `h-full`, никаких `vh`-высот
  внутри. Пульт: адаптивная страница со sticky-шапкой (меню, название экрана по-русски из `utils/screens.ts`, прогресс,
  «Далее»); на телефоне — вертикальная прокрутка, таблица игроков всегда доступна. Полосу цены на ТВ
  (`player/QuestionScore.tsx`) не менять — пользователь доволен её размером.
- **Паки.** `.siq` в `SIQ_DIR`; при старте пака медиа распаковываются в `PACKAGES_DIR/run-<pid>-<uuid>/<gameId>/`
  (чистятся только каталоги завершённых запусков) и раздаются как `/api/files/<gameId>/<Images|Audio|Video>/<name>`
  с поддержкой HTTP Range (URL строит `utils/api.ts` `mediaUrl`). Поддерживаются SIQ 5
  (`params`) и SIQ 4 (`scenario/atom`). Детали — `.claude/memory/dev/siq_format.md`.

### Новое socket-событие

1. Значение в enum `Event` — `common/data.ts`.
2. Request/Response/Payload и ветка `Dao` — `common/types.ts`.
3. Сервер: zod-схема в `src/schema.ts` (типизирована `z.ZodType<RequestX>`) + строка в `Controller.handlers()`;
   для пуша — `GameEvent` в `src/events.ts` и слушатель в `Controller` (`_gameListeners`).
4. Клиент: метод в `client/Client.ts`; для пуша — обработчик в `useGameConnection` + action в `store/game.ts`.

## Подводные камни

- Поля ввода в UI — из `components/override/` (`Input`, `InputNumber`): глобальный `keydown` (`hooks/useKeyPress.tsx`)
  шлёт нажатия как кнопки игроков (одиночные Ctrl/Alt/Cmd тоже кнопки); поля ввода, автоповтор и сочетания-шорткаты он игнорирует.
  Клавиши хранятся как `KeyboardEvent.code`, показываются через `keyLabel` (`utils/keys.ts`).
- Правильный ответ (`winPlayer`) сбрасывает очередь нажавших и выключает кнопки; «Повторить вопрос» включает снова.
- `selectPack` отвечает только после распаковки медиа — у клиента для него таймаут 180 с.
- XML-парсер работает с `parseTagValue: false`: тексты пака всегда строки.
- Jest-тесты сервиса (328) собирают `.siq`-фикстуры на лету (`test/helpers`); конфиг читается при импорте, поэтому env
  выставляется до `require` модулей приложения.
- Порт: сервер проверяет его до `listen` (`src/portGuard.ts`); если `PORT` не задан и 4000 занят — `/api/health` чужого
  процесса, затем 4001–4010, затем любой свободный. Баннер печатает реальный порт и две ссылки: для ТВ и для ведущего.
