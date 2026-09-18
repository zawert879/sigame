import { httpServer } from './app'
import { ADMIN_TOKEN, PORT, SIQ_DIR } from './config'
import { printStartupBanner } from './startupBanner'

// a stray rejection must not kill a running game (all game state lives in memory)
process.on('unhandledRejection', reason => {
  console.error('Необработанная ошибка:', reason)
})

httpServer.on('error', error => {
  const { code } = error as NodeJS.ErrnoException
  console.error(code === 'EADDRINUSE' ? `Порт ${PORT} уже занят. Закрой другую копию игры или задай PORT.` : error)
  process.exit(1)
})

httpServer.listen(PORT, () => {
  const address = httpServer.address()
  printStartupBanner(typeof address === 'object' && address ? address.port : PORT, ADMIN_TOKEN, SIQ_DIR)
})
