---
name: dev-environment
description: Инструменты и команды SI Game — Node 24, Yarn 1, build/dev/test/lint/smoke/package, env-переменные, каталоги данных
metadata:
  type: project
---

## Инструменты

Node 24 (root `engines`, CI, pkg-таргеты), Yarn 1 (classic, `--frozen-lockfile`), @yao-pkg/pkg 6.22.0 (через npx в
`scripts/package.js`). Rust 1.98 через rustup в `~/.cargo/bin` (установлен 2026-09-19 без правки профиля шелла — в PATH
не прописан; `scripts/launcher.js` добавляет его сам), таргеты aarch64/x86_64-apple-darwin и x86_64-pc-windows-msvc
(последний — только для `cargo clippy`), компоненты clippy и rustfmt. Tauri CLI — `launcher/node_modules` (`yarn --cwd launcher tauri`). В корне нет зависимостей и workspaces — `yarn install --frozen-lockfile` в `si-game-service/` и `si-game-admin-2/`.
`gh` CLI на машине нет; статус Actions публичного репо — через `https://api.github.com/repos/zawert879/sigame/actions/runs`.

## Команды

```zsh
# корень
yarn build                 # admin export (NEXT_PUBLIC_SERVER_URL='') → tsc сервиса → копия out/ в si-game-service/dist/public
yarn start                 # собранный сервер
yarn smoke [бинарник]      # поднимает сервер/бинарник, проверяет страницы, /_next ассеты, REST, socket.io
yarn package:win|mac|all   # release/sigame.exe, release/sigame-macos-arm64|x64 (+ .tar.gz, ad-hoc codesign только на macOS)
yarn launcher:mac          # DMG arm64 и x64 в release/ (CI=true — без Finder-оформления DMG)

# si-game-service/
yarn dev                   # node --watch -r ts-node/register src/index.ts
yarn typecheck | yarn lint | yarn test
yarn test test/game.test.ts ; yarn test -t "<имя>"
yarn start:debug           # с --inspect

# si-game-admin-2/
yarn dev                   # next dev :3000; сервер указать в .env.development.local: NEXT_PUBLIC_SERVER_URL=http://localhost:4000
yarn typecheck | yarn lint | yarn build
```

## Env сервера (`src/config.ts`, читаются при импорте)

`PORT` (иначе 4000 с запасными портами), `ADMIN_TOKEN` (opt-in), `SIQ_DIR`, `PACKAGES_DIR`, `FRONTEND_STATIC_DIR`.
Упакованный бинарник по умолчанию хранит данные в `siq/` рядом с собой, если такая папка есть, иначе
`~/Library/Application Support/SIGame` / `%LOCALAPPDATA%\SIGame`.

## Первый запуск скачанного приложения

macOS 15+: перетащить «SI Game» из DMG в «Программы», при первом запуске — Системные настройки → Конфиденциальность и
безопасность → «Всё равно открыть», либо `xattr -dr com.apple.quarantine "/Applications/SI Game.app"`.
Windows: установщик — SmartScreen «Подробнее → Выполнить в любом случае»; брандмауэр — кнопка в окне (UAC).
