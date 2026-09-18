---
name: dev-siq-format
description: Как SI Game читает .siq-паки — структура архива, опции XML-парсера, типы вопросов, построение страниц, раздача медиа
metadata:
  type: project
---

## Архив

`.siq` — zip: `content.xml` + каталоги `Images/`, `Audio/`, `Video/` (+ `Texts/`). Имена файлов в архиве
URI-кодированы. Разбор — `si-game-service/src/utils/parseSIQ.ts` (AdmZip, целиком в память, синхронно).
Типы структуры `content.xml` — `SIQ` namespace в `src/serverTypes.ts`.

## XML-парсер (fast-xml-parser 4)

`{ ignoreAttributes: false, attributesGroupName: 'attributes', attributeNamePrefix: '' }`:
- атрибуты лежат в `node.attributes.*`, текст узла с атрибутами — в `node['#text']`;
- элемент, встречающийся один раз, — **объект, а не массив**: везде нужен `Array.isArray(x) ? x : [x]`
  (так сделано для rounds/themes/questions/params; в `parseAnswerGroup` — нет, аудит B11);
- `parseTagValue` по умолчанию **true**: текст `007` → `7`, `0x10` → `16`, `1984` → number (аудит B10).
  Атрибуты остаются строками.

## Вопрос (`src/entity/Question.ts`)

- **Поддерживается только формат SIQ 5** (`params`). `scenario`/`atom` из SIQ 4 не парсятся — такие вопросы
  остаются без страниц (пустой экран, первый `next` закрывает вопрос).
- Тип — атрибут `type`: `stake`, `secret`, `secretPublicPrice`, `secretNoQuestion`, `noRisk`; любое другое
  значение (в т.ч. `bagcat`/`auction`/`sponsored` из enum в `serverTypes.ts`) → `default`.
- Цена — атрибут `price`; `price < 0` → вопрос сразу помечается сыгранным.
- `params.param` (формат SIQ 5): `theme` (переименовать тему), `question` (контент), `answer` (контент ответа),
  `selectionMode` (`exceptCurrent`/`any`), `price` с `numberSet {minimum, maximum, step}` → `CostType`
  (`accurate` / `between` / `step` / `minOrMaxInRound`), `type="group"` → ответ-группа (варианты).
- Правильные/неправильные ответы — `right.answer` / `wrong.answer` (приводятся к строке).

## Страницы (`PageBuilder`)

- Каждый `item` контента = страница (текст / image / audio(voice) / video / html); `placement="replic"` — реплика
  ведущего, страницу не создаёт; `waitForFinish` задан → элемент склеивается со следующим на одной странице.
- После контента вопроса — страница-**маркер** (`isMarker`), затем контент `answer` или текст первого правильного
  ответа. Без `params` у вопроса страниц нет — `next` сразу закрывает вопрос.

## Медиа

- При старте игры ассеты пишутся в `packages/<gameId>/<Images|Audio|Video>/<декодированное имя>`
  (`SiqPackage.saveAssets`, асинхронно, без await).
- Фронт строит URL `/api/files/<gameId>/<Images|Audio|Video>/<имя из content.xml>`; абсолютные `http(s)://`
  ссылки используются как есть. HTML-контент не рендерится.
