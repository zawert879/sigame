const { spawn } = require('child_process')
const fs = require('fs')
const net = require('net')
const os = require('os')
const path = require('path')

// Starts the built app and checks that it really serves the game: every page of the static frontend
// and every /_next asset they reference, the REST API and socket.io. Catches what typecheck, lint and
// the tests cannot: broken runtime imports in the compiled server, an incomplete static export,
// a packaged executable without its assets.
// Usage: node scripts/smoke.js [executable]
//   no argument — the compiled server (si-game-service/dist), run `yarn build` first;
//   executable  — a packaged build for this machine, e.g. release/sigame-macos-arm64.

const STARTUP_TIMEOUT_MS = 30000
const REQUEST_TIMEOUT_MS = 10000

// Every page of the static export and a URL that must serve it: /admin/<id> and /player/<id> are not
// prerendered, the server falls back to admin.html / player.html. Next writes the page into __NEXT_DATA__.
const PAGES = [
  { url: '/', page: '/' },
  { url: '/admin/smoke-test', page: '/admin' },
  { url: '/player/smoke-test', page: '/player' },
]

const root = path.resolve(__dirname, '..')
const serviceDir = path.join(root, 'si-game-service')
const serverEntry = path.join(serviceDir, 'dist', 'si-game-service', 'src', 'index.js')

const sleep = ms => new Promise(resolve => {
  setTimeout(resolve, ms)
})

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const get = url => fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), redirect: 'manual' })

const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer()
  server.once('error', reject)
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address()
    server.close(() => resolve(port))
  })
})

// Runs the server in a temporary working directory (packs, extracted files) with the default settings.
const startServer = async executable => {
  const target = executable ?? serverEntry
  if (!fs.existsSync(target)) {
    throw new Error(`${path.relative(root, target)} not found: run ${executable ? 'yarn package:<win|mac>' : 'yarn build'} first`)
  }

  const port = await freePort()
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sigame-smoke-'))
  const env = {
    ...process.env,
    PORT: String(port),
    SIQ_DIR: path.join(workDir, 'siq'),
    PACKAGES_DIR: path.join(workDir, 'packages'),
  }
  // the defaults are what ships: open control, frontend next to the compiled server / inside the executable
  delete env.ADMIN_TOKEN
  delete env.FRONTEND_STATIC_DIR

  console.log(`Starting ${path.relative(root, target)} on port ${port}`)
  const child = spawn(executable ?? process.execPath, executable ? [] : [serverEntry], {
    cwd: workDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let output = ''
  const collect = chunk => {
    output += chunk
  }

  child.stdout.on('data', collect)
  child.stderr.on('data', collect)

  let exitReason = null
  const exited = new Promise(resolve => {
    child.once('error', error => {
      exitReason ??= error.message
      resolve()
    })
    child.once('exit', (code, signal) => {
      exitReason ??= signal ? `killed by ${signal}` : `exit code ${code}`
      resolve()
    })
  })

  const base = `http://127.0.0.1:${port}`

  const waitUntilListening = async () => {
    const deadline = Date.now() + STARTUP_TIMEOUT_MS
    while (exitReason === null) {
      try {
        const response = await get(`${base}/api/packs`)
        await response.arrayBuffer()
        return
      } catch {
        assert(Date.now() < deadline, `the server did not answer within ${STARTUP_TIMEOUT_MS / 1000} s`)
        await sleep(200)
      }
    }

    throw new Error(`the server stopped before it started listening: ${exitReason}`)
  }

  const stop = async () => {
    if (exitReason === null) {
      child.kill()
      // an unref'd timer: it must not keep this process alive once the server is gone
      await Promise.race([exited, new Promise(resolve => {
        setTimeout(resolve, 5000).unref()
      })])
    }

    fs.rmSync(workDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }

  return { base, waitUntilListening, stop, output: () => output, exitReason: () => exitReason }
}

// socket.io-client is a dev dependency of the service (its tests use it)
const requestOverSocket = (base, event, payload) => new Promise((resolve, reject) => {
  const { io } = require(require.resolve('socket.io-client', { paths: [serviceDir] }))
  const socket = io(base, { reconnection: false, timeout: REQUEST_TIMEOUT_MS })
  const finish = (error, response) => {
    socket.close()
    if (error) {
      reject(error)
    } else {
      resolve(response)
    }
  }

  socket.once('connect_error', error => finish(error))
  socket.once('connect', () => {
    socket.timeout(REQUEST_TIMEOUT_MS).emitWithAck(event, payload).then(response => finish(null, response), finish)
  })
})

const runChecks = async server => {
  const failures = []
  const check = async (name, run) => {
    try {
      await run()
      console.log(`ok   ${name}`)
    } catch (error) {
      failures.push(name)
      console.log(`FAIL ${name}: ${error instanceof Error ? error.message : error}`)
    }
  }

  const assets = new Set()
  for (const { url, page } of PAGES) {
    await check(`GET ${url} serves the ${page} page`, async () => {
      const response = await get(server.base + url)
      assert(response.status === 200, `status ${response.status}`)
      const type = response.headers.get('content-type') ?? ''
      assert(type.startsWith('text/html'), `content-type "${type}"`)
      const html = await response.text()
      const served = /"page":"([^"]*)"/.exec(html)?.[1]
      assert(served === page, `got the ${served ?? 'unknown'} page`)
      for (const [, asset] of html.matchAll(/(?:src|href)="(\/_next\/[^"]+)"/g)) {
        assets.add(asset)
      }
    })
  }

  await check(`GET every /_next asset the pages reference (${assets.size})`, async () => {
    assert([...assets].some(asset => asset.endsWith('.js')), 'the pages reference no scripts')
    const missing = []
    await Promise.all([...assets].map(async asset => {
      const response = await get(server.base + asset)
      await response.arrayBuffer()
      // the SPA fallback answers an unknown path with index.html, so a missing file is 200 text/html too
      const type = response.headers.get('content-type') ?? ''
      if (response.status !== 200 || type.startsWith('text/html')) {
        missing.push(`${asset} (${response.status} ${type})`)
      }
    }))
    assert(missing.length === 0, `not served: ${missing.join(', ')}`)
  })

  await check('GET /api/packs returns the pack list', async () => {
    const response = await get(`${server.base}/api/packs`)
    assert(response.status === 200, `status ${response.status}`)
    const body = await response.json()
    assert(Array.isArray(body), `body ${JSON.stringify(body)}`)
  })

  await check('socket.io getGames returns the default game', async () => {
    const games = await requestOverSocket(server.base, 'getGames', {})
    assert(Array.isArray(games) && games.length > 0 && typeof games[0].gameId === 'string', `ack ${JSON.stringify(games)}`)
  })

  await check('the server is still running', async () => {
    assert(server.exitReason() === null, `the server stopped: ${server.exitReason()}`)
  })

  return failures
}

const main = async () => {
  const executable = process.argv[2] ? path.resolve(process.argv[2]) : null
  const server = await startServer(executable)
  let failures
  try {
    await server.waitUntilListening()
    failures = await runChecks(server)
  } catch (error) {
    console.error(`Server output:\n${server.output()}`)
    throw error
  } finally {
    await server.stop()
  }

  if (failures.length > 0) {
    console.error(`Server output:\n${server.output()}`)
    throw new Error(`${failures.length} check(s) failed`)
  }

  console.log('Smoke test passed')
}

main().catch(error => {
  console.error(`Smoke test failed: ${error instanceof Error ? error.message : error}`)
  process.exitCode = 1
})
