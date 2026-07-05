import { Screen } from '../src/data'
import { Game } from '../src/entity/Game'
import { clearPackages } from '../src/utils/clearPackages'

describe('Round #1', () => {
  clearPackages()
  const game = new Game('qwe')
  game.startGame('test.siq')

  it('next #1', () => {
    expect(game.screen).toBe(Screen.Screensaver)
    console.log(game.screen)
    
    game.next()

    expect(game.screen).toBe(Screen.ThemeListInRound)
    console.log(game.screen)
  
    game.next()

    expect(game.screen).toBe(Screen.RoundName)
    console.log(game.screen)
  
    game.next()

    expect(game.screen).toBe(Screen.ThemeList)
    console.log(game.screen)
  
    game.next()

    expect(game.screen).toBe(Screen.Table)
    console.log(game.screen)
  
    game.next()
    
    expect(game.screen).toBe(Screen.Table)
    console.log(game.screen)
    
    if(game.package){
      game.package.getCurrentRound().themes[1].questions[5].open()
      console.log(game.package.currentQuestion)
    }

  })

  // const round = game.package!.rounds[0]
  // describe('Theme #1', () => {
  //   // const theme = round.themes[0]
  //   describe('question #1', () => {
  //     // const question = theme.questions[0]
  //     it('#1', () => {
  //       round.themes[1].questions.forEach(q=>{
  //         console.log(q)
  //       })
  //     })
   
  //   })
  // })
})
