# MEMORY.md — sigame

Корневой индекс памяти проекта. Все файлы в `.claude/memory/` (структура и правила перенесены из `~/WORK`).

> Индексация и аудит — 2026-09-18 (`03fdab8`); все пункты аудита закрыты в ветке `fix/audit-2026-09-18` (2026-09-19).
> Отчёт — `docs/AUDIT-2026-09-18.md`, план окна запуска — `docs/LAUNCHER-PLAN.md`.

---

## Project

- [overview](project/overview.md) — что за игра, состав репо, устройства и сценарий, порты, рантайм-каталоги, режимы поставки
- [status](project/status.md) — ветка fix/audit-2026-09-18: коммиты, проверки, известные мелочи, ближайшие планы (2026-09-19)

---

## Dev

- [environment](dev/environment.md) — Node 24, Yarn 1, команды build/test/lint/smoke/package, env, каталоги данных, первый запуск
- [architecture](dev/architecture.md) — Koa + SPA-fallback, протокол с ack и admin-токеном, Controller-таблица, домен Game, экраны, порты
- [frontend](dev/frontend.md) — static export, клиент с реконнектом, zustand-стор, вёрстка ТВ/пульта через FitText, клавиши, медиа
- [siq_format](dev/siq_format.md) — разбор .siq: XML без числового приведения, SIQ 5 и SIQ 4, страницы, медиа и Html, манифест files

---

## Infra

- [deploy](infra/deploy.md) — CI: check.yml, build.yml (exe + mac-бинарники артефактами на каждый push), release.yml (тег v*)

---

## Plans

- [improvements](plans/improvements.md) — аудит закрыт; открытые: целостность паков, обложки, окно запуска, подпись

---

## Rules

- [global](rules/global.md) — no .env, no комментариев в коде, no Co-Authored-By, zsh, доки → `docs/`, тег v* = релиз
- [claude_best_practices](rules/claude_best_practices.md) — выжимка из code.claude.com/docs/ru/best-practices (копия из `~/WORK`)
