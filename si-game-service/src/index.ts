import { defaultGame, httpServer } from './app'
import { printStartupBanner } from './startupBanner'

httpServer.listen(4000, () => {
  printStartupBanner(defaultGame.id)
})