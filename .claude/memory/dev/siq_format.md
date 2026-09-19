---
name: dev-siq-format
description: Как SI Game читает .siq — архив, XML-парсер без числового приведения, SIQ 5 params и SIQ 4 scenario, страницы, медиа и Html, манифест files
metadata:
  type: project
---

## Архив

zip: `content.xml` + `Images/`, `Audio/`, `Video/`, `Html/` (+ `Texts/`, `quality.marker`). Имена записей URI-кодированы
(`Images/ac%20dc.jpg`). Разбор — `src/utils/parseSIQ.ts`: записи классифицируются по префиксу, без `content.xml` — понятная ошибка.

## XML (fast-xml-parser 4)

`ignoreAttributes:false, attributesGroupName:'attributes', attributeNamePrefix:'', parseTagValue:false` — тексты всегда строки
(`007` остаётся `007`). Один элемент — объект, несколько — массив: нормализовать везде (`src/utils/siqValue.ts`).

## Вопросы (`src/entity/Question.ts`)

- SIQ 5: `params.param` — `question`/`answer` (content items), `theme`, `selectionMode`, `price` (`numberSet` → `CostType`),
  `type="group"` → варианты ответа (текст или `{'#text'}` картинка). Тип — атрибут `type`: stake/secret/secretPublicPrice/
  secretNoQuestion/noRisk, прочее → default.
- SIQ 4: `scenario.atom` без `params` — text/image/voice/video/html, `say` → реплика, `marker` делит вопрос/ответ, `@file` → имя
  файла; `<type name="cat|bagcat">` → secret, `auction` → stake, `sponsored` → noRisk, параметры `theme`/`cost`.
- Страницы (`PageBuilder`): каждый item — страница; `waitForFinish` склеивает со следующим; `placement="replic"` — реплика;
  html с `isRef` → `htmlFile`. После вопроса первая страница ответа помечается `isMarker`; без контента ответа — текст первого
  правильного ответа.

## Медиа

`SiqPackage.saveAssets(siq, packDir)` — безопасное декодирование имён, защита от zip slip (выход за packDir пропускается),
пул записей с await, ошибки по файлу логируются. Игра переходит на Screensaver только после распаковки.
URL на фронте: `/api/files/<gameId>/<Images|Audio|Video|Html>/<имя из content.xml>`.

## Манифест `<files>` (SIQ 5)

`<files><file name="Audio/3 doors.mp3" hash="…"/>` — SHA-256 содержимого в верхнем регистре hex, имена раскодированы
(проверено на реальном паке 2026-09-18: 221/221 совпали, один файл был вне манифеста). Пока не используется — запланирована
проверка целостности при загрузке. Атрибут пака `logo="@cover.jpg"` (обложка) тоже пока не показывается.
