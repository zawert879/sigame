(() => {
  const params = new URLSearchParams(location.search)
  const flag = (name, fallback) => (params.has(name) ? params.get(name) : fallback)

  const ADDRESS_SETS = {
    0: [],
    1: [{ address: '192.168.1.135', name: 'en0', score: 350 }],
    2: [
      { address: '192.168.1.135', name: 'en0', score: 350 },
      { address: '10.0.0.12', name: 'en7', score: 220 },
    ],
    long: [
      { address: '192.168.100.235', name: 'Беспроводная сеть 2', score: 350 },
      { address: '172.31.255.254', name: 'vEthernet (Default Switch)', score: 120 },
      { address: '10.10.10.10', name: 'Ethernet 3', score: 90 },
    ],
  }

  const TOKENS = {
    0: null,
    1: 'k7Qm2x',
    long: 'f3b9c0d2e8a14b7f9c6d5e4a3b2c1d0e',
  }

  const addresses = ADDRESS_SETS[flag('addrs', '2')] || ADDRESS_SETS[2]
  const state = {
    status: flag('status', 'ready'),
    message: flag('message', null),
    port: Number(flag('port', '4000')),
    addresses,
    selectedAddress: addresses.length ? addresses[0].address : null,
    gameId: '7c1e2f0a-1b2c-4d5e-8f90-a1b2c3d4e5f6',
    adminToken: flag('token', '0') in TOKENS ? TOKENS[flag('token', '0')] : flag('token', null),
    connections: { player: Number(flag('player', '0')), admin: Number(flag('admin', '0')) },
    packsCount: Number(flag('packs', '3')),
    siqDir: flag('platform', 'macos') === 'windows'
      ? 'C:\\Users\\Игорь Рожков\\AppData\\Local\\SIGame\\siq'
      : '/Users/zawert/Library/Application Support/SIGame/siq',
    logDir: '/Users/zawert/Library/Logs/SIGame',
    version: flag('version', '1.0.0'),
    platform: flag('platform', 'macos'),
    tvBrowser: flag('browser', '') || null,
    firewall: flag('firewall', flag('platform', 'macos') === 'windows' ? 'missing' : 'unsupported'),
    serverPath: flag('platform', 'macos') === 'windows' ? 'C:\\Users\\Иван Петров\\AppData\\Local\\SI Game\\sigame-server.exe' : '/Applications/SI Game.app/Contents/MacOS/sigame-server',
  }

  const fail = new Set((flag('fail', '') || '').split(',').filter(Boolean))
  const delay = Number(flag('delay', '0'))
  const listeners = new Map()
  const calls = []

  const snapshot = () => JSON.parse(JSON.stringify(state))

  const emit = () => {
    for (const handler of listeners.get('launcher-state') || []) {
      handler({ event: 'launcher-state', id: 1, payload: snapshot() })
    }
  }

  const hash = text => {
    let value = 2166136261
    for (let index = 0; index < text.length; index += 1) {
      value ^= text.charCodeAt(index)
      value = Math.imul(value, 16777619) >>> 0
    }
    return value
  }

  const fakeQr = text => {
    const size = text.length > 40 ? 33 : 25
    let seed = hash(text) || 1
    const random = () => {
      seed ^= seed << 13
      seed ^= seed >>> 17
      seed ^= seed << 5
      return (seed >>> 0) / 4294967296
    }
    const finder = (x, y) => {
      for (const [fx, fy] of [[0, 0], [size - 7, 0], [0, size - 7]]) {
        const dx = x - fx
        const dy = y - fy
        if (dx >= -1 && dx <= 7 && dy >= -1 && dy <= 7) {
          if (dx < 0 || dy < 0 || dx > 6 || dy > 6) {
            return 0
          }
          const ring = Math.min(dx, dy, 6 - dx, 6 - dy)
          return ring === 1 ? 0 : 1
        }
      }
      return -1
    }
    let d = ''
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const fixed = finder(x, y)
        const dark = fixed === -1 ? random() < 0.5 : fixed === 1
        if (dark) {
          d += `M${x + 4} ${y + 4}h1v1h-1z`
        }
      }
    }
    const full = size + 8
    return `<?xml version="1.0" standalone="yes"?><svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${full * 8}" height="${full * 8}" viewBox="0 0 ${full} ${full}" shape-rendering="crispEdges"><rect x="0" y="0" width="${full}" height="${full}" fill="#ffffff"/><path fill="#000000" d="${d}"/></svg>`
  }

  const handlers = {
    get_state: () => snapshot(),
    select_address: ({ address }) => {
      state.selectedAddress = address
      emit()
      return null
    },
    qr_svg: ({ text }) => fakeQr(text),
    open_admin: () => null,
    open_tv: () => null,
    copy_text: () => null,
    open_packs_folder: () => null,
    open_logs_folder: () => null,
    allow_firewall: () => {
      state.firewall = 'allowed'
      emit()
      return null
    },
    restart_server: () => {
      state.status = 'starting'
      emit()
      setTimeout(() => {
        state.status = 'ready'
        state.message = null
        emit()
      }, 1200)
      return null
    },
    quit: () => null,
  }

  const invoke = async (command, args = {}) => {
    calls.push({ command, args })
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    if (fail.has(command)) {
      throw `mock: команда ${command} завершилась ошибкой`
    }
    const handler = handlers[command]
    if (!handler) {
      throw `mock: неизвестная команда ${command}`
    }
    return handler(args)
  }

  const listen = async (name, handler) => {
    const list = listeners.get(name) || []
    list.push(handler)
    listeners.set(name, list)
    return () => {
      listeners.set(name, (listeners.get(name) || []).filter(item => item !== handler))
    }
  }

  window.__TAURI__ = { core: { invoke }, event: { listen } }
  window.__mock = {
    calls,
    fail,
    get state() {
      return snapshot()
    },
    set(patch) {
      Object.assign(state, patch)
      emit()
    },
    emit,
  }
})()
