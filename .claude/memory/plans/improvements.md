---
name: plans-improvements
description: Бэклог улучшений по аудиту 2026-09-18 — ID S/B/C/A/F/D, приоритеты, статусы
metadata:
  type: project
---

Источник: `docs/AUDIT-2026-09-18.md` (описание, file:line, варианты фикса). Здесь — только трекинг.
При закрытии задачи менять статус и дату; при новых находках — дописывать в аудит или новый `docs/AUDIT-*.md`.

Статусы: `open` · `in progress` · `done (дата)` · `wontfix (причина)`.

## P0 — безопасность (минуты работы)

| ID | Задача | Статус |
|---|---|---|
| S1 | Удалить `GET /api/fatal` | open |
| S2 | Санитизировать имя файла в upload (basename, `.siq`, внутри `siqDir`) | open |
| S3 | Zip Slip в `SiqPackage.saveAssets` | open |
| S4 | Проверять `file` в `selectPack` | open |

## P1 — надёжность игры

| ID | Задача | Статус |
|---|---|---|
| B1 | `saveAssets`: await + обработка ошибок, старт после распаковки | open |
| B2 | Реконнект: re-handshake + re-selectGame на клиенте, ack всегда, таймауты | open |
| B3 | `preValidate` — `throw` и разумный таймаут | open |
| B4 | `getGame` отвечает при отсутствии игры | open |
| B9 | QR в консоли → `/` | open |
| B10 | `parseTagValue: false` в XML-парсере | open |
| B5, B6 | Экран Results: восстановление при reload + подписка в админке | open |

## P2 — CI и сборка

| ID | Задача | Статус |
|---|---|---|
| C1 | Один workflow вместо двух одинаковых | open |
| C5 | Job `check` (tsc ×2, lint) перед deploy | open |
| S6 | Убрать `--inspect` из прод-команд | open |
| C3 | Уйти с `pkg@5.8.1`/node16 (`@yao-pkg/pkg` или Node SEA) | open |
| C4 | Удалить устаревшие per-app Dockerfile/docker-compose | open |
| C2, C6 | cleanup через `repository_owner` + `needs`; prod-deps в образе | open |

## P3 — рефакторинг

| ID | Задача | Статус |
|---|---|---|
| A1 | Enum'ы в `common/data.ts` вместо двух `src/data.ts` | open |
| A2 | Одна реализация страниц admin/player вместо пар `*.tsx` + `*/[id].tsx` | open |
| A3, A4 | Обёртка обработчиков Controller + zod-валидация payload'ов | open |
| A7 | Тесты: фикстура `.siq` + state machine `Game.next()` | open |
| A8 | Починить lint сервиса | open |
| A9 | Store игры на zustand вместо `useState` + мутаций | open |
| F1 | Единый `apiUrl()` для REST/медиа | open |
| F2 | Импорты `antd` / `@ant-design/icons` вместо `/lib` | open |

## P4 — по мере касания кода

B7, B8, B11–B22, S5, S7, F3–F8, A5, A6, D1 — см. аудит.
