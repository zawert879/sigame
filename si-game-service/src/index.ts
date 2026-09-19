import fs from 'fs'
import { defaultGame, httpServer, io, launcherStatus } from './app'
import { APP_VERSION } from './appInfo'
import { ADMIN_TOKEN, isLauncherMode, isPortExplicit, PORT, SIQ_DIR } from './config'
import { failedLine, readyLine, reportStatus } from './launcherStatus'
import { type ListenResult, listenFailureMessage, listenSafely } from './portGuard'
import { getLanCandidates, printStartupBanner, tvUrl } from './startupBanner'
import { mediaDir, RM_OPTIONS } from './utils/packages'

const FORCED_EXIT_DELAY = 2000

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

const fail = (message: string) => {
  if (isLauncherMode) {
    console.log(failedLine(message))
  } else {
    console.error(message)
  }

  exitAfterOutput(1)
}

const stopWithLauncher = (stopReporter: () => void) => {
  let isStopping = false
  const stop = () => {
    if (isStopping) {
      return
    }

    isStopping = true
    setTimeout(() => {
      process.exit(0)
    }, FORCED_EXIT_DELAY).unref()
    stopReporter()
    io.close()
    try {
      fs.rmSync(mediaDir, RM_OPTIONS)
    } catch {}

    exitAfterOutput(0)
  }

  for (const stream of [process.stdout, process.stderr]) {
    stream.on('error', stop)
  }

  process.stdin.once('end', stop)
  process.stdin.once('close', stop)
  process.stdin.once('error', stop)
  process.stdin.resume()
}

const announceLauncher = async (port: number) => {
  const packsCount = await launcherStatus.refreshPacks()
  console.log(readyLine({
    version: APP_VERSION,
    port,
    addresses: getLanCandidates(),
    gameId: defaultGame.id,
    adminToken: ADMIN_TOKEN,
    siqDir: SIQ_DIR,
    packsCount,
  }))
  const stopReporter = reportStatus(launcherStatus, line => {
    console.log(line)
  })
  const stopWatching = launcherStatus.watchPacks()
  stopWithLauncher(() => {
    stopReporter()
    stopWatching()
  })
}

const onListening = async (port: number) => {
  httpServer.on('error', error => {
    console.error('Ошибка HTTP-сервера:', error)
  })
  if (!isPortExplicit && port !== PORT) {
    console.log(`Порт ${PORT} занят, SI Game запущена на порту ${port}.`)
  }

  if (isLauncherMode) {
    await announceLauncher(port)
  } else {
    printStartupBanner(port, ADMIN_TOKEN, SIQ_DIR)
  }
}

const onRunning = (port: number) => {
  if (isLauncherMode) {
    fail(`На порту ${port} уже запущена SI Game: ${tvUrl(port)}`)
    return
  }

  console.log(`SI Game уже запущена: ${tvUrl(port)}`)
  exitAfterOutput(0)
}

const handleListen = async (result: ListenResult) => {
  switch (result.status) {
    case 'running': {
      onRunning(result.port)
      break
    }

    case 'failed': {
      fail(listenFailureMessage(result, tvUrl(result.port)))
      break
    }

    case 'listening': {
      await onListening(result.port)
      break
    }

    default: {
      break
    }
  }
}

const start = async () => {
  const result = await listenSafely(httpServer, { port: PORT, isExplicit: isPortExplicit, treatRunningAsBusy: isLauncherMode })
  await handleListen(result)
}

void start()
