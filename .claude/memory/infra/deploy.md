---
name: infra-deploy
description: CI и десктопные релизы SI Game — build.yml собирает exe и mac-бинарники на каждый push, release.yml публикует их по тегу v*
metadata:
  type: project
---

Docker-деплой (GHCR + dcm.zawserv.ru) удалён 2026-09-18 по решению пользователя — поставка только десктопная.

## Workflows

| Файл | Триггер | Что делает |
|---|---|---|
| `.github/workflows/check.yml` | pull_request, workflow_call | Linux: install (frozen) → typecheck/lint/test сервиса, typecheck/lint админки, `yarn build`, `yarn smoke` |
| `.github/workflows/build.yml` | push в любую ветку, workflow_dispatch, workflow_call | check → macos-latest: `yarn package:all` → smoke mac-бинарника → артефакты `sigame-windows-x64`, `sigame-macos-arm64`, `sigame-macos-x64` (14 дней) |
| `.github/workflows/release.yml` | тег `v*`, workflow_dispatch(tag) | build.yml → GitHub Release с `sigame.exe`, `sigame-macos-arm64.tar.gz`, `sigame-macos-x64.tar.gz` |

Все платформы пакуются на одном macOS-раннере: `scripts/package.js` вызывает `@yao-pkg/pkg@6.22.0` с `--no-bytecode`
(кросс-сборка exe без запуска Windows-бинарника), mac-бинарники подписываются ad-hoc `codesign` и упаковываются в tar.gz
(сохраняет исполняемый бит). Node 24 везде (setup-node, pkg-таргеты, root `engines`).

## Ограничения

- Без Apple Developer ID бинарник не нотаризован: после скачивания Gatekeeper блокирует первый запуск
  (правый клик → «Открыть» или `xattr -d com.apple.quarantine <файл>`). На Windows без сертификата — предупреждение SmartScreen.
- `gh` CLI на машине не установлен; статус Actions для публичного репо `zawert879/sigame` смотреть через
  `https://api.github.com/repos/zawert879/sigame/actions/runs`.
