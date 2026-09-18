---
name: dev-environment
description: Инструменты и команды SI Game — Yarn 1, Node, сборка, dev-режимы, тесты, линт, env-переменные
metadata:
  type: project
---

## Инструменты

| Что | Версия | Где зафиксировано |
|---|---|---|
| Yarn | **1 (classic)** — lockfile v1, `--frozen-lockfile` | `yarn.lock` в каждом приложении, CI |
| Node | 20 в CI/Docker; локально сборка проверена на 24.21 | `Dockerfile`, `release-windows.yml` |
| Node в exe | 16 (`pkg@5.8.1 --targets node16-win-x64`) | `scripts/package-win.js` |
| TypeScript | 5.x; сервис — `commonjs`/`es2020`, декораторы (`bind-decorator`) | `si-game-service/tsconfig.json` |

Корневой `package.json` **без зависимостей и без workspaces** — ставить в каждом приложении отдельно:

```zsh
(cd si-game-service && yarn install --frozen-lockfile)
(cd si-game-admin-2 && yarn install --frozen-lockfile)
```

## Команды

```zsh
# корень
yarn build            # next build (export → si-game-admin-2/out) → tsc сервиса → копия out/ в si-game-service/dist/public
yarn start            # собранный сервер на :4000 (с --inspect)
yarn package:win      # build + pkg → release/sigame.exe

# si-game-service/
yarn dev              # ts-node src/index.ts — БЕЗ watch, перезапускать вручную
yarn build            # rimraf dist && tsc → dist/si-game-service/src/index.js
npx tsc --noEmit      # typecheck (отдельного скрипта нет)
yarn lint             # eslint 8 + xo/xo-typescript (сейчас красный, 33 ошибки)
yarn test             # jest (ts-jest); один файл: yarn test test/siq.test.ts; по имени: yarn test -t "next #1"

# si-game-admin-2/
yarn dev              # next dev на :3000
yarn build            # static export → out/ (next build сам гоняет next lint)
yarn lint             # next lint
npx tsc --noEmit
```

Точка входа собранного сервиса — `dist/si-game-service/src/index.js`, а не `dist/index.js`: `tsc` включает
`../common`, поэтому `rootDir` = корень репо и в `dist/` появляются `common/` и `si-game-service/`.

## Dev-режимы

- **Полный (рекомендуется для проверки фич):** `yarn build && yarn start` в корне → http://localhost:4000.
- **Раздельный:** `yarn dev` в сервисе + `yarn dev` в админке с `NEXT_PUBLIC_SERVER_URL=localhost:4000` в
  `si-game-admin-2/.env.local`. Работают только сокеты: REST (`/api/upload`, `/api/packs`) и медиа (`/api/files/...`)
  идут по относительным URL на :3000 и ломаются (аудит F1).
- Для игры нужен хотя бы один `.siq` в `si-game-service/siq/` (загрузить через UI или положить руками).

## Env-переменные

| Переменная | Где | Смысл |
|---|---|---|
| `FRONTEND_STATIC_DIR` | сервис | каталог статики фронтенда; по умолчанию `<dist>/public` |
| `NEXT_PUBLIC_SERVER_URL` | админка (build-time) | адрес socket.io-сервера; пусто → `window.location.origin` |
| `NODE_ENV=production` | Docker | ни на что в коде не влияет |

## Тесты

Jest-конфиг — `preset: ts-jest`. Реальных тестов нет (аудит A7): `siq.test.ts` требует каталог `packages/` и
фикстуру `siq/test.siq` (оба gitignored) и проверяет устаревший порядок экранов.
