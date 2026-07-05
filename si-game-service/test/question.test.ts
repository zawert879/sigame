// import { QuestionType, ScenarioType } from '../src/data'
// import { PageBuilder, Question } from '../src/entity/Question'
// import siqToPackage from '../src/mappers/siqToPackage'
// import * as Types from '../src/types'
// import { parseSIQ } from '../src/utils/parseSIQ'
// import * as Schema from '../src/schema'

// const siq = parseSIQ(`./siq/test2.siq`)
// const gamePackage = siqToPackage(siq.content)
// const gamePackageData = Schema.gamePackage.parse(gamePackage)

// it.skip('question #1', async () => {
//   const questionData: Types.Question = {
//     info: {
//       authors: null,
//       comments: null,
//     },
//     isClose: true,
//     price: 100,
//     rightAnswer: ['keka'],
//     type: QuestionType.DEFAULT,
//     scenario: [{
//       type: ScenarioType.DEFAULT,
//       text: 'text : 1',
//       time: null
//     }, {
//       type: ScenarioType.DEFAULT,
//       text: 'text : 2',
//       time: null
//     }, {
//       type: ScenarioType.DEFAULT,
//       text: 'text : 3',
//       time: null
//     }]
//   }

//   const question = new Question(questionData)

//   expect(question.price).toBe(questionData.price)

//   console.log(question.isClose)

//   question.open()
//   question.open()
//   question.back()
//   question.open()
//   question.back()

//   console.log(question.isClose)

//   expect(question).not.toBeNull()
// })

// it.skip('PageBuilder #1', async () => {
//   const pageBuilder = new PageBuilder()

//   const pages = pageBuilder.setText('text').setImage('image').saveAndNextPage().setMarker(true).saveAndNextPage().setText('ответ').saveAndNextPage().saveAndNextPage().setVoice('voice').finish()

//   expect(pages.length).toBe(4)
//   expect(pages[1].isMarker).toBe(true)
// })

// it.skip('create Question #1', async () =>{
//   const questionData = gamePackageData.rounds[0].themes[2].questions[0]
//   console.log(gamePackageData.rounds[0].themes[2])
//   console.log(questionData)
//   const question = new Question(questionData)

//   const pages = question.makePages(questionData.scenario!)

//   console.log(pages)
// })
it.skip('kek', () => { })