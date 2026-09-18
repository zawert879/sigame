import path from 'path'
import { CostType, QuestionAnswerType, QuestionType, SelectionModeType } from '../src/data'
import { PageBuilder } from '../src/entity/PageBuilder'
import type { Question } from '../src/entity/Question'
import { SiqPackage } from '../src/entity/SiqPackage'
import { parseSIQ } from '../src/utils/parseSIQ'
import { makeTempDir, packageXml, page, siq4Entries, siq5Entries, writeZip, type ZipEntries } from './helpers/fixtures'

let dir: string
let counter = 0

beforeAll(() => {
  dir = makeTempDir('question-')
})

// the real pipeline: zip → parseSIQ → SiqPackage → Round → Theme → Question
const loadPackage = (entries: ZipEntries): SiqPackage => new SiqPackage(parseSIQ(writeZip(path.join(dir, `p${counter++}.siq`), entries)))

const parseQuestions = (questionsXml: string): Question[] =>
  loadPackage({ 'content.xml': packageXml(questionsXml) }).rounds[0].themes[0].questions

const parseQuestion = (questionXml: string): Question => parseQuestions(questionXml)[0]

const byPrice = (siqPackage: SiqPackage, roundIndex: number, price: number): Question => {
  const question = siqPackage.rounds[roundIndex].questions.find(item => item.price === price)
  if (!question) {
    throw new Error(`no question ${price} in round ${roundIndex}`)
  }

  return question
}

describe('PageBuilder', () => {
  test('saveAndNextPage stores a page only when something was set', () => {
    const builder = new PageBuilder()
    builder.saveAndNextPage().saveAndNextPage()
    expect(builder.pagesCount).toBe(0)
    expect(builder.hasPendingPage).toBe(false)

    builder.setText('a')
    expect(builder.hasPendingPage).toBe(true)
    builder.setImage('b.png').saveAndNextPage()
    expect(builder.pagesCount).toBe(1)
    expect(builder.hasPendingPage).toBe(false)
    expect(builder.finish().map(item => item.snapshot)).toEqual([page({ text: 'a', image: 'b.png' })])
  })

  test('a marker makes a page even without content', () => {
    const pages = new PageBuilder().setText('q').saveAndNextPage().setMarker(true).finish()
    expect(pages.map(item => item.snapshot)).toEqual([page({ text: 'q' }), page({ isMarker: true })])
  })

  test('a replic does not create a page, it is attached to the next saved page only', () => {
    const builder = new PageBuilder()
    builder.setReplic('hello').saveAndNextPage()
    expect(builder.pagesCount).toBe(0)
    const pages = builder.setVoice('a.mp3').saveAndNextPage().setVideo('b.mp4').saveAndNextPage().setHtml('c.html').finish()
    expect(pages.map(item => item.snapshot)).toEqual([
      page({ voice: 'a.mp3', replic: 'hello' }),
      page({ video: 'b.mp4' }),
      page({ html: 'c.html' }),
    ])
  })

  test('endSection / finish: a waiting replic gets a page of its own, a pending page keeps it', () => {
    const builder = new PageBuilder().setReplic('alone').endSection()
    expect(builder.finish().map(item => item.snapshot)).toEqual([page({ replic: 'alone' })])

    const pages = new PageBuilder().setReplic('with text').setText('t').endSection().setMarker(true).setText('a').setReplic('last').finish()
    expect(pages.map(item => item.snapshot)).toEqual([page({ text: 't', replic: 'with text' }), page({ isMarker: true, text: 'a', replic: 'last' })])

    // nothing waits: nothing is added
    expect(new PageBuilder().endSection().finish()).toEqual([])
  })

  test('refresh drops the pending page, clear drops everything', () => {
    const builder = new PageBuilder().setText('saved').saveAndNextPage().setText('pending').setReplic('r')
    builder.refresh()
    expect(builder.finish().map(item => item.snapshot)).toEqual([page({ text: 'saved' })])
    expect(builder.clear().pagesCount).toBe(0)
    expect(builder.finish()).toEqual([])
  })
})

describe('Question: SIQ 5 fixture pack', () => {
  let siqPackage: SiqPackage

  beforeAll(() => {
    siqPackage = loadPackage(siq5Entries())
  })

  test('default question: numeric text stays a string, then media, then the marker page with the right answer', () => {
    const question = byPrice(siqPackage, 0, 100)
    expect(question.type).toBe(QuestionType.DEFAULT)
    expect(question.pages).toEqual([
      page({ text: '007' }),
      page({ image: 'pic 1.png' }),
      page({ isMarker: true, text: 'Бонд' }),
    ])
    expect(typeof question.currentPage?.text).toBe('string')
    expect(question.rightAnswer).toEqual(['Бонд'])
    expect(question.wrongAnswer).toBeNull()
    expect(question.comments).toBeNull()
    expect(question.themeName).toBe('Тема 1')
    expect(question.isAvailable).toBe(true)
    expect(question.answerType).toBe(QuestionAnswerType.DEFAULT)
    expect(question.answerGroup).toEqual([])
    expect(question.selectPrice).toBeNull()
    expect(question.selectionMode).toBeNull()
  })

  test('stake question: the answer param replaces the right answer on the marker page, price numberSet with a step', () => {
    const question = byPrice(siqPackage, 0, 200)
    expect(question.type).toBe(QuestionType.STAKE)
    expect(question.pages).toEqual([page({ text: 'Ставка' }), page({ isMarker: true, text: '1984' })])
    expect(question.rightAnswer).toEqual(['1984'])
    expect(question.selectPrice).toEqual({ minimum: 100, maximum: 500, step: 100, type: CostType.STEP })
  })

  test('a question with a negative price is not available from the start', () => {
    const question = byPrice(siqPackage, 0, -1)
    expect(question.isAvailable).toBe(false)
    expect(question.pagesCount).toBe(2)
  })

  test('answer group with a single option', () => {
    const question = byPrice(siqPackage, 0, 300)
    expect(question.answerType).toBe(QuestionAnswerType.Group)
    expect(question.answerGroup).toEqual([{ answer: 'Один', variant: 'A' }])
    expect(question.pages).toEqual([page({ text: 'Выбери вариант' }), page({ isMarker: true, text: 'A' })])
  })

  test('secret question: theme / selectionMode / exact price params and a multi-option group with an image', () => {
    const question = byPrice(siqPackage, 0, 400)
    expect(question.type).toBe(QuestionType.SECRET)
    expect(question.themeName).toBe('Секретная тема')
    expect(question.selectionMode).toBe(SelectionModeType.EXCEPT_CURRENT)
    expect(question.selectPrice).toEqual({ minimum: 400, maximum: 400, step: 0, type: CostType.ACCURATE })
    expect(question.answerType).toBe(QuestionAnswerType.Group)
    expect(question.answerGroup).toEqual([
      { answer: 'Альфа', variant: 'A' },
      { answer: { '#text': 'b.png' }, variant: 'B' },
      { answer: '42', variant: 'C' },
    ])
  })

  test('noRisk question: replic, media shown together (waitForFinish), video, html, answer content', () => {
    const question = byPrice(siqPackage, 0, 500)
    expect(question.type).toBe(QuestionType.NO_RISC)
    expect(question.pages).toEqual([
      page({ replic: 'Реплика ведущего', voice: 'song.mp3', text: 'Что звучит?' }),
      page({ video: 'clip.mp4' }),
      page({ html: 'https://example.com/page.html' }),
      page({ isMarker: true, text: 'Ответ текстом' }),
      page({ image: 'answer.png' }),
    ])
    expect(question.rightAnswer).toEqual(['Песня', 'Мелодия'])
    expect(question.wrongAnswer).toEqual(['Шум'])
    expect(question.comments).toBe('Комментарий вопроса')
  })

  test('final round questions', () => {
    const [f1] = siqPackage.rounds[1].questions
    expect(f1.price).toBe(0)
    expect(f1.isAvailable).toBe(true)
    expect(f1.pages).toEqual([page({ text: 'Ф1 вопрос' }), page({ isMarker: true, text: 'ф1' })])
  })
})

describe('Question: SIQ 4 fixture pack (type + scenario)', () => {
  let siqPackage: SiqPackage

  beforeAll(() => {
    siqPackage = loadPackage(siq4Entries())
  })

  test('atoms become pages; \'@\' media refs lose the \'@\'; a say at the end of the question is a page of the question', () => {
    const question = byPrice(siqPackage, 0, 100)
    expect(question.type).toBe(QuestionType.DEFAULT)
    expect(question.pages).toEqual([
      page({ text: 'Текст вопроса' }),
      page({ image: 'cat.png' }),
      page({ replic: 'Реплика' }),
      page({ isMarker: true, voice: 'ans.mp3' }),
    ])
  })

  test('a question of say atoms only is shown before its answer', () => {
    const withoutMarker = parseQuestion(`<question price="100"><scenario>
      <atom type="say">Кто написал «Войну и мир»?</atom>
    </scenario><right><answer>Толстой</answer></right></question>`)
    const withMarker = parseQuestion(`<question price="100"><scenario>
      <atom type="say">Кто написал «Войну и мир»?</atom>
      <atom type="marker" />
      <atom type="say">Конечно</atom>
      <atom>Толстой</atom>
      <atom type="say">Лев Николаевич</atom>
    </scenario><right><answer>Толстой</answer></right></question>`)
    expect(withoutMarker.pages).toEqual([page({ replic: 'Кто написал «Войну и мир»?' }), page({ isMarker: true, text: 'Толстой' })])
    expect(withMarker.pages).toEqual([
      page({ replic: 'Кто написал «Войну и мир»?' }),
      page({ isMarker: true, text: 'Толстой', replic: 'Конечно' }),
      page({ replic: 'Лев Николаевич' }),
    ])
    expect(withMarker.currentPage).toEqual(page({ replic: 'Кто написал «Войну и мир»?' }))
  })

  test('cat: secret with theme, exact cost, and "except current" selection by default', () => {
    const question = byPrice(siqPackage, 0, 200)
    expect(question.type).toBe(QuestionType.SECRET)
    expect(question.themeName).toBe('Кошки')
    expect(question.selectPrice).toEqual({ minimum: 300, maximum: 300, step: 0, type: CostType.ACCURATE })
    expect(question.selectionMode).toBe(SelectionModeType.EXCEPT_CURRENT)
    // no marker in the scenario: an answer page with the right answer is added
    expect(question.pages).toEqual([page({ text: 'Кот в мешке' }), page({ isMarker: true, text: 'Мяу' })])
  })

  test('auction: stake; numeric text stays a string; a URL is used as is', () => {
    const question = byPrice(siqPackage, 0, 300)
    expect(question.type).toBe(QuestionType.STAKE)
    expect(question.selectPrice).toBeNull()
    expect(question.selectionMode).toBeNull()
    expect(question.pages).toEqual([
      page({ text: '007' }),
      page({ video: 'https://example.com/v.mp4' }),
      page({ isMarker: true, text: '1984' }),
    ])
  })

  test('sponsored: noRisk; a marker without answer atoms shows the right answer', () => {
    const question = byPrice(siqPackage, 0, 400)
    expect(question.type).toBe(QuestionType.NO_RISC)
    expect(question.pages).toEqual([page({ text: 'Вопрос от спонсора' }), page({ isMarker: true, text: 'Спонсор' })])
  })

  test('bagcat: cost 0 is "min or max of the round", self=true allows any player', () => {
    const question = byPrice(siqPackage, 0, 500)
    expect(question.type).toBe(QuestionType.SECRET)
    expect(question.selectPrice).toEqual({ minimum: 0, maximum: 0, step: 0, type: CostType.MIN_OR_MAX_IN_ROUND })
    expect(question.selectionMode).toBe(SelectionModeType.ANY)
    expect(question.pages).toEqual([page({ html: 'page.html' }), page({ isMarker: true, text: 'Ответ' })])
  })

  test('scenario details: a second marker is ignored, empty and unknown atoms are skipped, text keeps its \'@\'', () => {
    const question = parseQuestion(`<question price="100"><scenario>
      <atom>@home</atom>
      <atom type="weird">x</atom>
      <atom></atom>
      <atom type="marker" />
      <atom type="text">ответ</atom>
      <atom type="marker" />
      <atom type="audio">@a.mp3</atom>
    </scenario><right><answer>ответ</answer></right></question>`)
    expect(question.pages).toEqual([
      page({ text: '@home' }),
      page({ isMarker: true, text: 'ответ' }),
      page({ voice: 'a.mp3' }),
    ])
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('неизвестный тип atom "weird"'))
  })
})

describe('Question: type mapping', () => {
  test.each([
    ['stake', QuestionType.STAKE],
    ['secret', QuestionType.SECRET],
    ['secretPublicPrice', QuestionType.SECRET_PUBLIC_PRICE],
    ['secretNoQuestion', QuestionType.SECRET_NO_QUESTION],
    ['noRisk', QuestionType.NO_RISC],
    ['simple', QuestionType.DEFAULT],
    ['unknownType', QuestionType.DEFAULT],
  ])('SIQ 5 type="%s" → %s', (type, expected) => {
    const question = parseQuestion(`<question price="100" type="${type}"><params><param name="question" type="content"><item>q</item></param></params></question>`)
    expect(question.type).toBe(expected)
  })

  test('SIQ 5 question without a type is default', () => {
    expect(parseQuestion('<question price="100"><params><param name="question" type="content"><item>q</item></param></params></question>').type)
      .toBe(QuestionType.DEFAULT)
  })

  test.each([
    ['cat', QuestionType.SECRET],
    ['bagcat', QuestionType.SECRET],
    ['auction', QuestionType.STAKE],
    ['sponsored', QuestionType.NO_RISC],
    ['simple', QuestionType.DEFAULT],
  ])('SIQ 4 <type name="%s"> → %s', (name, expected) => {
    const question = parseQuestion(`<question price="100"><type name="${name}" /><scenario><atom>q</atom></scenario></question>`)
    expect(question.type).toBe(expected)
  })
})

describe('Question: SIQ 5 params', () => {
  const withPrice = (numberSet: string) => parseQuestion(`<question price="100" type="stake"><params>
    <param name="question" type="content"><item>q</item></param>
    <param name="price" type="numberSet">${numberSet}</param>
  </params></question>`)

  test('price numberSet → cost type', () => {
    expect(withPrice('<numberSet minimum="100" maximum="500" />').selectPrice)
      .toEqual({ minimum: 100, maximum: 500, step: 0, type: CostType.BETWEEN })
    expect(withPrice('<numberSet minimum="0" maximum="0" />').selectPrice)
      .toEqual({ minimum: 0, maximum: 0, step: 0, type: CostType.MIN_OR_MAX_IN_ROUND })
    expect(withPrice('').selectPrice).toBeNull()
  })

  test('selectionMode: exceptCurrent, anything else is any', () => {
    const withMode = (mode: string) => parseQuestion(`<question price="1"><params>
      <param name="selectionMode">${mode}</param>
      <param name="question" type="content"><item>q</item></param>
    </params></question>`).selectionMode
    expect(withMode('exceptCurrent')).toBe(SelectionModeType.EXCEPT_CURRENT)
    expect(withMode('any')).toBe(SelectionModeType.ANY)
    expect(withMode('whatever')).toBe(SelectionModeType.ANY)
  })

  test('invalid group options are skipped with a warning; unknown params are reported, known passive ones are not', () => {
    jest.mocked(console.warn).mockClear()
    const question = parseQuestion(`<question price="1"><params>
      <param name="question" type="content"><item>q</item></param>
      <param name="answerType">select</param>
      <param name="answerDeviation">5</param>
      <param name="mystery">x</param>
      <param name="answerOptions" type="group">
        <param type="content"><item>no variant name</item></param>
        <param name="B" type="content"></param>
        <param name="C" type="content"><item>ok</item></param>
      </param>
    </params></question>`)
    expect(question.answerGroup).toEqual([{ answer: 'ok', variant: 'C' }])
    expect(question.answerType).toBe(QuestionAnswerType.Group)
    const warnings = jest.mocked(console.warn).mock.calls.map(call => String(call[0]))
    expect(warnings.filter(warning => warning.includes('некорректный вариант ответа'))).toHaveLength(2)
    expect(warnings.filter(warning => warning.includes('неизвестный параметр'))).toEqual([expect.stringContaining('"mystery"')])
  })

  test('only the last of several answer params is used', () => {
    const question = parseQuestion(`<question price="1"><params>
      <param name="question" type="content"><item>q</item></param>
      <param name="answer" type="content"><item>first</item></param>
      <param name="answer" type="content"><item>second</item></param>
    </params><right><answer>right</answer></right></question>`)
    expect(question.pages).toEqual([page({ text: 'q' }), page({ isMarker: true, text: 'second' })])
  })

  test('without answer content and right answer the marker page is empty', () => {
    const question = parseQuestion('<question price="1"><params><param name="question" type="content"><item>q</item></param></params></question>')
    expect(question.pages).toEqual([page({ text: 'q' }), page({ isMarker: true })])
    expect(question.rightAnswer).toBeNull()
  })

  test('empty items are skipped; a replic at the end of the question is a page of the question, not of the answer', () => {
    const question = parseQuestion(`<question price="1"><params>
      <param name="question" type="content"><item></item><item>q</item><item placement="replic">скажи</item></param>
    </params><right><answer>a</answer></right></question>`)
    expect(question.pages).toEqual([page({ text: 'q' }), page({ replic: 'скажи' }), page({ isMarker: true, text: 'a' })])
  })

  test('a question of a replic only opens on the replic, not on the answer', () => {
    const question = parseQuestion(`<question price="100"><params>
      <param name="question" type="content"><item placement="replic">Кто написал «Войну и мир»?</item></param>
    </params><right><answer>Толстой</answer></right></question>`)
    expect(question.pages).toEqual([page({ replic: 'Кто написал «Войну и мир»?' }), page({ isMarker: true, text: 'Толстой' })])
    expect(question.currentPage?.isMarker).toBe(false)
  })

  test('replics of the answer: with the right answer on the marker page, or a page of their own at the end', () => {
    const replicOnly = parseQuestion(`<question price="1"><params>
      <param name="question" type="content"><item>q</item></param>
      <param name="answer" type="content"><item placement="replic">Верно!</item></param>
    </params><right><answer>a</answer></right></question>`)
    expect(replicOnly.pages).toEqual([page({ text: 'q' }), page({ isMarker: true, text: 'a', replic: 'Верно!' })])

    const trailing = parseQuestion(`<question price="1"><params>
      <param name="question" type="content"><item>q</item></param>
      <param name="answer" type="content"><item>a</item><item placement="replic">Пояснение</item></param>
    </params><right><answer>a</answer></right></question>`)
    expect(trailing.pages).toEqual([page({ text: 'q' }), page({ isMarker: true, text: 'a' }), page({ replic: 'Пояснение' })])
  })
})

describe('Question: navigation', () => {
  test('restart / goToNextPage / goToAnswer / markPlayed', () => {
    const question = parseQuestion(`<question price="100"><params>
      <param name="question" type="content"><item>one</item><item>two</item></param>
    </params><right><answer>three</answer></right></question>`)
    expect(question.pagesCount).toBe(3)
    expect(question.pageIndex).toBe(0)
    expect(question.currentPage?.text).toBe('one')
    expect(question.nextPage?.text).toBe('two')

    expect(question.goToNextPage()).toBe(true)
    expect(question.goToNextPage()).toBe(true)
    expect(question.pageIndex).toBe(2)
    expect(question.nextPage).toBeNull()
    expect(question.goToNextPage()).toBe(false)
    expect(question.pageIndex).toBe(2)

    question.restart()
    expect(question.pageIndex).toBe(0)
    expect(question.goToAnswer()).toBe(true)
    expect(question.currentPage).toEqual(page({ isMarker: true, text: 'three' }))

    question.markPlayed()
    expect(question.isAvailable).toBe(false)
    expect(question.pageIndex).toBe(0)
  })

  test('goToAnswer goes to the first page of a long answer and never back', () => {
    const question = parseQuestion(`<question price="100"><params>
      <param name="question" type="content"><item>q</item></param>
      <param name="answer" type="content"><item>Ответ 1</item><item type="image" isRef="True">a.png</item></param>
    </params><right><answer>Ответ 1</answer></right></question>`)
    expect(question.pages).toEqual([page({ text: 'q' }), page({ isMarker: true, text: 'Ответ 1' }), page({ image: 'a.png' })])

    expect(question.goToAnswer()).toBe(true)
    expect(question.pageIndex).toBe(1)
    expect(question.goToAnswer()).toBe(false)
    question.goToNextPage()
    expect(question.goToAnswer()).toBe(false)
    expect(question.pageIndex).toBe(2)
  })

  test('a question without content has no pages', () => {
    const question = parseQuestion('<question price="100"><right><answer>a</answer></right></question>')
    expect(question.pages).toBeNull()
    expect(question.pagesCount).toBe(0)
    expect(question.currentPage).toBeNull()
    expect(question.goToNextPage()).toBe(false)
    expect(question.goToAnswer()).toBe(false)
  })

  test('a question without a price costs 0 and is available', () => {
    const question = parseQuestion('<question><params><param name="question" type="content"><item>q</item></param></params></question>')
    expect(question.price).toBe(0)
    expect(question.isAvailable).toBe(true)
  })
})
