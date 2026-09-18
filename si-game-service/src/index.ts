import { httpServer } from './app'
import { ADMIN_TOKEN, isPortExplicit, PORT, SIQ_DIR } from './config'
import { listenFailureMessage, listenSafely } from './portGuard'
import { printStartupBanner, tvUrl } from './startupBanner'

process.on('unhandledRejection', reason => {
  console.error('Необработанная ошибка:', reason)
})

const exitAfterOutput = (code: number) => {
  process.exitCode = code
  process.stdout.write('', () => {
    process.stderr.write('', () => {
      process.exit(code)
    })
  })
}

const start = async () => {
  const result = await listenSafely(httpServer, { port: PORT, isExplicit: isPortExplicit })
  switch (result.status) {
    case 'running': {
      console.log(`SI Game уже запущена: ${tvUrl(result.port)}`)
      exitAfterOutput(0)
      break
    }

    case 'failed': {
      console.error(listenFailureMessage(result, tvUrl(result.port)))
      exitAfterOutput(1)
      break
    }

    case 'listening': {
      httpServer.on('error', error => {
        console.error('Ошибка HTTP-сервера:', error)
      })
      if (!isPortExplicit && result.port !== PORT) {
        console.log(`Порт ${PORT} занят, SI Game запущена на порту ${result.port}.`)
      }

      printStartupBanner(result.port, ADMIN_TOKEN, SIQ_DIR)
      break
    }

    default: {
      break
    }
  }
}

void start()
