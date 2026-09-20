---
name: infra-deploy
description: CI и десктопные релизы SI Game — build.yml собирает окно запуска (DMG arm64/x64, NSIS) на каждый push, release.yml публикует их по тегу v*
metadata:
  type: project
---

Docker-деплой (GHCR + dcm.zawserv.ru) удалён 2026-09-18 по решению пользователя — поставка только десктопная.

## Workflows

| Файл | Триггер | Что делает |
|---|---|---|
| `.github/workflows/check.yml` | pull_request, workflow_call | Linux: install (frozen) → typecheck/lint/test сервиса, typecheck/lint админки, `yarn build`, `yarn smoke` |
| `.github/workflows/build.yml` | push в любую ветку, workflow_dispatch, workflow_call | check → матрица `launcher`: macos-latest × aarch64/x86_64, windows-latest × x86_64-pc-windows-msvc: build → сайдкар (`package.js <t> --sidecar`) → smoke сайдкара (x64 через Rosetta) → `launcher.js <t> --skip-build --skip-sidecar` → артефакты `sigame-launcher-macos-arm64|macos-x64|windows-x64` (14 дней) |
| `.github/workflows/release.yml` | тег `v*`, workflow_dispatch(tag) | build.yml → GitHub Release только с `SI-Game-<v>-macos-arm64.dmg`, `…-macos-x64.dmg`, `…-windows-x64.exe` |

Сайдкар — `@yao-pkg/pkg@6.22.0` с `--no-bytecode`, Node 24; mac-сайдкар подписывается ad-hoc. Tauri 2.11 собирает `.app`/DMG
(ad-hoc `signingIdentity "-"`, без hardened runtime, entitlements allow-jit) и NSIS (установка для текущего пользователя).
Отдельные бинарники сервера (`sigame.exe`, `sigame-macos-*`) больше не публикуются — решение пользователя 2026-09-19;
`yarn package:*` остаётся для локальной проверки и smoke.

## Ограничения

- Метка `com.apple.quarantine` ставится браузером при скачивании: DMG, собранный локально, её не имеет и ставится без
  предупреждений; со скачанного — «Открыть всё равно» или `xattr -dr com.apple.quarantine "/Applications/SI Game.app"`.
- Без Apple Developer ID бинарник не нотаризован: после скачивания Gatekeeper блокирует первый запуск. На macOS 15+
  правый клик → «Открыть» больше не работает: Системные настройки → Конфиденциальность и безопасность → «Всё равно открыть»
  (~1 час после попытки) или `xattr -d com.apple.quarantine <файл>`. Ad-hoc подпись без hardened runtime — с `--options runtime`
  pkg-бинарник на Node 24 падает без entitlement `com.apple.security.cs.allow-jit`.
- Windows без сертификата — SmartScreen «Выполнить в любом случае»; включённый Smart App Control блокирует без обхода.
- `gh` CLI на машине не установлен; статус Actions для публичного репо `zawert879/sigame` смотреть через
  `https://api.github.com/repos/zawert879/sigame/actions/runs`.
