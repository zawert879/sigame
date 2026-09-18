# MEMORY.md — sigame

Корневой индекс памяти проекта. Все файлы в `.claude/memory/` (структура и правила перенесены из `~/WORK`).

> Первая полная индексация и аудит — 2026-09-18, коммит `03fdab8`. Отчёт — `docs/AUDIT-2026-09-18.md`.

---

## Project

- [overview](project/overview.md) — что за игра, состав репо, устройства и сценарий, порты, рантайм-каталоги, режимы поставки
- [status](project/status.md) — что собирается/проходит на 2026-09-18, главные риски, заглушки, мёртвый код

---

## Dev

- [environment](dev/environment.md) — Yarn 1, Node 20/16, команды build/dev/test/lint, dev-режимы, env-переменные
- [architecture](dev/architecture.md) — Koa + SPA-fallback, socket-протокол, Controller, модель Game→Question, экранная state machine, как добавить событие
- [frontend](dev/frontend.md) — static export, дубли страниц admin/player, client-синглтон, клавиши-кнопки, синхронизация медиа
- [siq_format](dev/siq_format.md) — разбор .siq: опции XML-парсера, типы вопросов, построение страниц, только SIQ 5

---

## Infra

- [deploy](infra/deploy.md) — CI: check.yml, build.yml (exe + mac-бинарники артефактами на каждый push), release.yml (тег v*)

---

## Plans

- [improvements](plans/improvements.md) — бэклог по аудиту 2026-09-18 (S/B/C/A/F/D), приоритеты P0–P4, статусы

---

## Rules

- [global](rules/global.md) — no .env, no комментариев в коде, no Co-Authored-By, zsh, доки → `docs/`, тег v* = релиз
- [claude_best_practices](rules/claude_best_practices.md) — выжимка из code.claude.com/docs/ru/best-practices (копия из `~/WORK`)
