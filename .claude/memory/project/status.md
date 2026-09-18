---
name: project-status
description: Состояние проекта на 2026-09-18 — что собирается/проходит, что сломано, незавершённые фичи, мёртвый код
metadata:
  type: project
---

> Индексация и аудит — 2026-09-18, коммит `03fdab8`. Полный отчёт с file:line — `docs/AUDIT-2026-09-18.md`,
> трекинг задач — [[plans-improvements]].

## Проверки (прогнаны 2026-09-18, локально Node 24.21 / Yarn 1.22)

| Проверка | Результат |
|---|---|
| `yarn build` в корне | ✅ |
| `npx tsc --noEmit` в `si-game-service/` и `si-game-admin-2/` | ✅ 0 ошибок |
| `yarn lint` сервиса (eslint 8 + xo) | ❌ 33 ошибки (29 — `--fix`) |
| `yarn lint` админки (`next lint`) | ⚠️ только warnings `react-hooks/exhaustive-deps` |
| `yarn test` сервиса | ❌ 3 failed, 2 skipped, 0 реальных тестов |
| Smoke собранного сервера | ✅ `/api/packs`, SPA-fallback admin/player |

## Главные риски (детали в аудите)

- `GET /api/fatal` → `process.exit(1)`; path traversal в upload; Zip Slip при распаковке — при том, что образ
  деплоится в интернет (S1–S3).
- Unhandled rejection при распаковке ассетов может уронить процесс (B1).
- После переподключения сокета UI «мертвеет» до перезагрузки страницы (B2).

## Незавершённые фичи / заглушки

- Меню: disabled «Повторить вопрос», «Отменить вопрос», «Настройки»; `Progress` с захардкоженными числами.
- HTML-контент вопросов не рендерится («HTML не поддерживается»); `replic` парсится, но не показывается.
- Настройки громкости хранятся на сервере, но к плееру не применяются.
- Нет финала игры: после Results последнего раунда `next` ничего не делает.
- Спец-вопросы (ставка / кот в мешке / без риска) — только экран-заставка типа; ставки и передачу ведущий
  отыгрывает вручную правкой очков.
- Лобби со списком игр (`Games.tsx`) недостижимо — `/` сразу редиректит на первую игру.

## Мёртвый код

Сервис: `entity/Timer.ts`, `schema.ts`, `Question.autoClose/back`, `question.json`, deps `@socket.io/admin-ui`,
`nanoid`, `dotenv`, `iconv-lite`. Админка: `QuestionVideo`/`QuestionAudio`/`QuestionMediaPlayer`, deps `immer`,
`@mux/mux-video`, страницы `/test*`. Per-app Dockerfile/docker-compose — устарели.
