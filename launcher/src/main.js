(() => {
  'use strict'

  const tauri = window.__TAURI__
  const byId = id => document.getElementById(id)

  const el = {
    statusText: byId('status-text'),
    failure: byId('failure'),
    failureTitle: byId('failure-title'),
    failureMessage: byId('failure-message'),
    restart: byId('restart'),
    openLogs: byId('open-logs'),
    share: byId('share'),
    tabs: Array.from(document.querySelectorAll('[role="tab"]')),
    panel: byId('share-panel'),
    liveTv: byId('live-tv'),
    liveAdmin: byId('live-admin'),
    qr: byId('qr'),
    caption: byId('caption'),
    addr: byId('addr'),
    copy: byId('copy'),
    netWrap: byId('net-wrap'),
    net: byId('net'),
    netName: byId('net-name'),
    offlineRestart: byId('offline-restart'),
    hint: byId('hint'),
    openAdmin: byId('open-admin'),
    openTv: byId('open-tv'),
    tvHint: byId('tv-hint'),
    connections: byId('connections'),
    packs: byId('packs'),
    openPacks: byId('open-packs'),
    token: byId('token'),
    fwMac: byId('fw-mac'),
    fwLinux: byId('fw-linux'),
    fwOk: byId('fw-ok'),
    fwAsk: byId('fw-ask'),
    fwAllow: byId('fw-allow'),
    fwWhy: byId('fw-why'),
    fwManual: byId('fw-manual'),
    version: byId('version'),
    openLogsFoot: byId('open-logs-foot'),
    quit: byId('quit'),
    toast: byId('toast'),
  }

  const STATUSES = ['starting', 'ready', 'failed', 'stopped']
  const PLATFORMS = ['macos', 'windows', 'linux']
  const STATUS_TEXT = {
    starting: 'Запускается…',
    failed: 'Ошибка запуска',
    stopped: 'Игра остановлена',
  }
  const COPY_LABEL = 'Скопировать'
  const COPIED_LABEL = 'Скопировано'
  const QUIT_LABEL = 'Остановить и выйти'
  const QUIT_CONFIRM_LABEL = 'Точно выйти? Игра прервётся'
  const FIREWALL_LABEL = 'Разрешить в брандмауэре'
  const FIREWALL_BUSY_LABEL = 'Ждём подтверждения…'

  const EMPTY = {
    status: 'starting',
    message: null,
    port: null,
    addresses: [],
    selectedAddress: null,
    gameId: null,
    adminToken: null,
    connections: { player: 0, admin: 0 },
    packsCount: null,
    siqDir: null,
    logDir: null,
    version: null,
    platform: 'macos',
    tvBrowser: null,
    firewall: 'unknown',
  }

  let state = { ...EMPTY, connections: { ...EMPTY.connections } }
  let tab = 'tv'
  let firewallFailed = false
  let firewallBusy = false
  let copyTimer = 0
  let quitTimer = 0
  let quitArmed = false
  let toastTimer = 0
  let addressKey = ''
  let qrUrl = null
  const busy = new Set()
  const qrCache = new Map()

  const errorText = error => {
    if (typeof error === 'string') {
      return error
    }
    if (error && typeof error.message === 'string') {
      return error.message
    }
    try {
      return JSON.stringify(error)
    } catch {
      return String(error)
    }
  }

  const call = (command, args) => {
    if (!tauri || !tauri.core || typeof tauri.core.invoke !== 'function') {
      return Promise.reject(new Error('нет связи с приложением'))
    }
    return tauri.core.invoke(command, args)
  }

  const hideToast = () => {
    clearTimeout(toastTimer)
    el.toast.hidden = true
  }

  const showToast = text => {
    const clean = String(text).replace(/\s+/g, ' ').trim()
    el.toast.textContent = clean.length > 240 ? `${clean.slice(0, 239)}…` : clean
    el.toast.hidden = false
    clearTimeout(toastTimer)
    toastTimer = setTimeout(hideToast, 6000)
  }

  const run = async (command, args, failText) => {
    if (busy.has(command)) {
      return false
    }
    busy.add(command)
    try {
      await call(command, args)
      return true
    } catch (error) {
      showToast(`${failText}: ${errorText(error)}`)
      return false
    } finally {
      busy.delete(command)
    }
  }

  const keys = (...list) => ({ keys: list })
  const strong = text => ({ strong: text })

  const fill = (node, parts) => {
    const children = []
    for (const part of parts) {
      if (typeof part === 'string') {
        children.push(document.createTextNode(part))
      } else if (part && part.keys) {
        const group = document.createElement('span')
        group.className = 'keys'
        part.keys.forEach(key => {
          if (key === '+') {
            group.append('+')
            return
          }
          const kbd = document.createElement('kbd')
          kbd.textContent = key
          group.append(kbd)
        })
        children.push(group)
      } else if (part && part.strong) {
        const bold = document.createElement('b')
        bold.textContent = part.strong
        children.push(bold)
      }
    }
    node.replaceChildren(...children)
  }

  const isMac = () => state.platform === 'macos'

  const fullscreenKeys = () => (isMac() ? keys('⌃', '⌘', 'F') : keys('F11'))

  const normalize = next => {
    const source = next && typeof next === 'object' ? next : {}
    const merged = { ...EMPTY, ...source }
    merged.status = STATUSES.includes(merged.status) ? merged.status : 'starting'
    merged.platform = PLATFORMS.includes(merged.platform) ? merged.platform : 'macos'
    merged.addresses = Array.isArray(merged.addresses)
      ? merged.addresses.filter(item => item && typeof item.address === 'string' && item.address)
      : []
    const connections = merged.connections && typeof merged.connections === 'object' ? merged.connections : {}
    merged.connections = {
      player: Number(connections.player) || 0,
      admin: Number(connections.admin) || 0,
    }
    merged.port = Number.isFinite(Number(merged.port)) && merged.port !== null ? Number(merged.port) : null
    return merged
  }

  const isReady = () => state.status === 'ready' && state.port !== null

  const currentHost = () => {
    const list = state.addresses
    if (!list.length) {
      return '127.0.0.1'
    }
    const selected = list.find(item => item.address === state.selectedAddress)
    return (selected || list[0]).address
  }

  const hostPart = host => (host.includes(':') ? `[${host}]` : host)

  const urlFor = target => {
    if (!isReady()) {
      return null
    }
    const base = `http://${hostPart(currentHost())}:${state.port}`
    if (target === 'admin') {
      const token = state.adminToken ? `?token=${encodeURIComponent(state.adminToken)}` : ''
      return `${base}/admin/${token}`
    }
    return `${base}/`
  }

  const parseSvg = text => {
    const template = document.createElement('template')
    template.innerHTML = String(text)
    const svg = template.content.querySelector('svg')
    if (!svg) {
      throw new Error('пустой ответ')
    }
    svg.querySelectorAll('script, foreignObject').forEach(node => node.remove())
    if (!svg.getAttribute('viewBox')) {
      const width = parseFloat(svg.getAttribute('width'))
      const height = parseFloat(svg.getAttribute('height'))
      if (width > 0 && height > 0) {
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
      }
    }
    svg.removeAttribute('width')
    svg.removeAttribute('height')
    svg.removeAttribute('style')
    if (!svg.getAttribute('shape-rendering')) {
      svg.setAttribute('shape-rendering', 'crispEdges')
    }
    return svg
  }

  const fetchQr = text => {
    let pending = qrCache.get(text)
    if (!pending) {
      pending = call('qr_svg', { text }).then(parseSvg)
      pending.catch(() => qrCache.delete(text))
      qrCache.set(text, pending)
    }
    return pending
  }

  const qrNote = (label, iconPath) => {
    const wrap = document.createElement('div')
    wrap.className = 'qr-note'
    const ns = 'http://www.w3.org/2000/svg'
    const icon = document.createElementNS(ns, 'svg')
    icon.setAttribute('viewBox', '0 0 24 24')
    icon.setAttribute('fill', 'none')
    icon.setAttribute('stroke', 'currentColor')
    icon.setAttribute('stroke-width', '1.8')
    icon.setAttribute('stroke-linecap', 'round')
    icon.setAttribute('stroke-linejoin', 'round')
    icon.setAttribute('aria-hidden', 'true')
    const path = document.createElementNS(ns, 'path')
    path.setAttribute('d', iconPath)
    icon.append(path)
    const caption = document.createElement('span')
    caption.textContent = label
    wrap.append(icon, caption)
    return wrap
  }

  const NO_NETWORK_ICON = 'M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01M3 3l18 18'
  const QR_ERROR_ICON = 'M12 8v5M12 16.5h.01M10.3 3.9L2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z'

  const setQrMode = (mode, label) => {
    el.qr.dataset.mode = mode
    el.qr.setAttribute('role', 'img')
    el.qr.setAttribute('aria-label', label)
  }

  const renderQr = url => {
    if (!isReady()) {
      qrUrl = null
      if (el.qr.dataset.mode !== 'loading') {
        el.qr.replaceChildren()
      }
      setQrMode('loading', 'QR-код появится после запуска')
      return
    }
    if (!state.addresses.length) {
      qrUrl = null
      if (el.qr.dataset.mode !== 'offline') {
        el.qr.replaceChildren(qrNote('Нет сети', NO_NETWORK_ICON))
      }
      setQrMode('offline', 'QR-кода нет: компьютер не подключён к локальной сети')
      return
    }
    if (qrUrl === url) {
      return
    }
    qrUrl = url
    if (el.qr.dataset.mode !== 'qr') {
      el.qr.replaceChildren()
      setQrMode('loading', 'QR-код загружается')
    }
    fetchQr(url).then(svg => {
      if (qrUrl !== url) {
        return
      }
      el.qr.replaceChildren(svg.cloneNode(true))
      setQrMode('qr', `QR-код: ${url}`)
    }).catch(error => {
      if (qrUrl !== url) {
        return
      }
      el.qr.replaceChildren(qrNote('QR-код недоступен', QR_ERROR_ICON))
      setQrMode('error', 'QR-код недоступен')
      showToast(`Не удалось построить QR-код: ${errorText(error)}`)
    })
  }

  const renderNetworks = () => {
    const list = state.addresses
    const key = list.map(item => `${item.name || ''}|${item.address}`).join(',')
    if (key !== addressKey) {
      addressKey = key
      el.net.replaceChildren(...list.map(item => {
        const option = document.createElement('option')
        option.value = item.address
        option.textContent = item.name ? `${item.name} · ${item.address}` : item.address
        return option
      }))
    }
    const host = currentHost()
    el.netWrap.hidden = list.length < 2
    if (list.length >= 2) {
      if (el.net.value !== host) {
        el.net.value = host
      }
      const chosen = list.find(item => item.address === host)
      el.net.title = chosen && chosen.name ? `Сеть: ${chosen.name} · ${chosen.address}` : `Сеть: ${host}`
    }
    el.netName.hidden = list.length !== 1
    if (list.length === 1) {
      el.netName.textContent = list[0].name ? `Сеть: ${list[0].name}` : ''
      el.netName.title = el.netName.textContent
    }
    el.net.disabled = !isReady()
  }

  const renderShare = () => {
    const ready = isReady()
    const lan = state.addresses.length > 0
    const url = urlFor(tab)
    el.addr.textContent = url || 'Адрес появится через пару секунд'
    const offline = ready && !lan
    if (offline) {
      el.caption.dataset.tone = 'warn'
      fill(el.caption, [strong('Нет локальной сети.'), ' Игра открывается только на этом компьютере. Подключитесь к Wi‑Fi или кабелю и перезапустите.'])
    } else {
      delete el.caption.dataset.tone
      if (!ready) {
        el.caption.textContent = 'Запускаем сервер игры — обычно это пара секунд.'
      } else if (tab === 'tv') {
        el.caption.textContent = 'Откройте этот адрес в браузере телевизора или компьютера у ТВ — в той же сети, что и этот компьютер.'
      } else {
        el.caption.textContent = 'Отсканируйте телефоном ведущего — откроется пульт управления игрой.'
      }
    }
    el.copy.disabled = !ready
    el.offlineRestart.hidden = !offline
    if (tab === 'tv') {
      fill(el.hint, isMac()
        ? ['Полный экран — кнопкой «На весь экран» или ', fullscreenKeys()]
        : ['Полный экран — кнопкой «На весь экран» или ', keys('F11'), ' или ', keys('Fn', '+', 'F11')])
    } else {
      fill(el.hint, [state.adminToken
        ? 'В ссылке есть admin-токен — не показывайте этот QR-код игрокам.'
        : 'Пульт откроется без входа. Телефон должен быть в той же сети.'])
    }
    el.liveTv.dataset.on = String(ready && state.connections.player > 0)
    el.liveAdmin.dataset.on = String(ready && state.connections.admin > 0)
    renderNetworks()
    renderQr(url)
  }

  const connectionNode = (label, count) => {
    const node = document.createElement('span')
    node.className = 'conn'
    node.dataset.on = String(count > 0)
    node.textContent = `${label} ${count}`
    return node
  }

  const renderFacts = () => {
    const ready = isReady()
    if (ready) {
      const sep = document.createElement('span')
      sep.className = 'sep'
      sep.textContent = '·'
      el.connections.replaceChildren(
        connectionNode('ТВ', state.connections.player),
        sep,
        connectionNode('пульт', state.connections.admin),
      )
    } else {
      el.connections.textContent = '—'
    }
    const packs = Number.isFinite(Number(state.packsCount)) && state.packsCount !== null ? String(state.packsCount) : '—'
    el.packs.textContent = packs
    el.openPacks.title = state.siqDir || ''
    el.token.textContent = ready ? (state.adminToken ? 'включён' : 'выключен') : '—'
  }

  const renderFirewall = () => {
    const platform = state.platform
    const windows = platform === 'windows'
    const allowed = state.firewall === 'allowed'
    if (allowed) {
      firewallFailed = false
    }
    el.fwMac.hidden = platform !== 'macos'
    el.fwLinux.hidden = platform !== 'linux'
    el.fwOk.hidden = !(windows && allowed)
    el.fwAsk.hidden = !(windows && (state.firewall === 'missing' || state.firewall === 'unknown'))
    el.fwManual.hidden = !(windows && !allowed && (firewallFailed || state.firewall === 'unsupported'))
    el.fwWhy.hidden = firewallFailed
    el.fwAllow.textContent = firewallBusy ? FIREWALL_BUSY_LABEL : FIREWALL_LABEL
    el.fwAllow.setAttribute('aria-busy', String(firewallBusy))
  }

  const renderTvHint = () => {
    const exitKeys = fullscreenKeys()
    if (state.tvBrowser) {
      fill(el.tvHint, [`Откроется в ${state.tvBrowser} на весь экран, звук включится сам. Выйти из полного экрана — `, exitKeys])
    } else {
      fill(el.tvHint, ['Откроется в браузере. Полный экран: ', exitKeys, '; звук включится после первого клика.'])
    }
  }

  const render = () => {
    const status = state.status
    document.body.dataset.status = status
    document.body.dataset.platform = state.platform
    el.statusText.textContent = status === 'ready'
      ? (state.port !== null ? `Игра запущена · порт ${state.port}` : 'Игра запущена')
      : STATUS_TEXT[status]

    const down = status === 'failed' || status === 'stopped'
    el.failure.hidden = !down
    el.share.hidden = down
    if (down) {
      el.failureTitle.textContent = status === 'failed' ? 'Не удалось запустить игру' : 'Игра остановлена'
      el.failureMessage.textContent = state.message || (status === 'failed'
        ? 'Сервер игры не запустился. Подробности — в журнале.'
        : 'Сервер игры завершил работу.')
      el.restart.textContent = status === 'failed' ? 'Перезапустить' : 'Запустить снова'
    } else {
      renderShare()
    }

    const ready = isReady()
    el.openAdmin.disabled = !ready
    el.openTv.disabled = !ready
    renderTvHint()
    renderFacts()
    renderFirewall()
    el.version.textContent = state.version ? `v${state.version}` : ''
    el.version.hidden = !state.version
  }

  const apply = next => {
    state = normalize(next)
    render()
  }

  const refresh = async () => {
    try {
      apply(await call('get_state'))
    } catch (error) {
      showToast(`Не удалось получить состояние: ${errorText(error)}`)
    }
  }

  const setTab = (target, focus) => {
    tab = target
    for (const button of el.tabs) {
      const selected = button.dataset.target === target
      button.setAttribute('aria-selected', String(selected))
      button.tabIndex = selected ? 0 : -1
      if (selected) {
        el.panel.setAttribute('aria-labelledby', button.id)
        if (focus) {
          button.focus()
        }
      }
    }
    render()
  }

  el.tabs.forEach((button, index) => {
    button.addEventListener('click', () => setTab(button.dataset.target, false))
    button.addEventListener('keydown', event => {
      const last = el.tabs.length - 1
      let next = null
      if (event.key === 'ArrowRight') {
        next = index === last ? 0 : index + 1
      } else if (event.key === 'ArrowLeft') {
        next = index === 0 ? last : index - 1
      } else if (event.key === 'Home') {
        next = 0
      } else if (event.key === 'End') {
        next = last
      }
      if (next !== null) {
        event.preventDefault()
        setTab(el.tabs[next].dataset.target, true)
      }
    })
  })

  el.copy.addEventListener('click', async () => {
    const url = urlFor(tab)
    if (!url) {
      return
    }
    const done = await run('copy_text', { text: url }, 'Не удалось скопировать адрес')
    if (!done) {
      return
    }
    el.copy.textContent = COPIED_LABEL
    el.copy.dataset.done = 'true'
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      el.copy.textContent = COPY_LABEL
      delete el.copy.dataset.done
    }, 1500)
  })

  el.net.addEventListener('change', async () => {
    const address = el.net.value
    state = { ...state, selectedAddress: address }
    render()
    const done = await run('select_address', { address }, 'Не удалось переключить сеть')
    if (!done) {
      await refresh()
    }
  })

  el.openAdmin.addEventListener('click', () => {
    run('open_admin', undefined, 'Не удалось открыть пульт ведущего')
  })

  el.openTv.addEventListener('click', () => {
    run('open_tv', undefined, 'Не удалось открыть экран игроков')
  })

  el.openPacks.addEventListener('click', () => {
    run('open_packs_folder', undefined, 'Не удалось открыть папку с паками')
  })

  const openLogs = () => {
    run('open_logs_folder', undefined, 'Не удалось открыть папку с журналом')
  }
  el.openLogs.addEventListener('click', openLogs)
  el.openLogsFoot.addEventListener('click', openLogs)

  const restart = () => {
    run('restart_server', undefined, 'Не удалось перезапустить игру')
  }
  el.restart.addEventListener('click', restart)
  el.offlineRestart.addEventListener('click', restart)

  el.fwAllow.addEventListener('click', async () => {
    if (firewallBusy) {
      return
    }
    firewallBusy = true
    render()
    const done = await run('allow_firewall', undefined, 'Не удалось добавить правило брандмауэра')
    firewallBusy = false
    if (!done) {
      firewallFailed = true
    }
    render()
  })

  const disarmQuit = () => {
    clearTimeout(quitTimer)
    quitArmed = false
    el.quit.textContent = QUIT_LABEL
    delete el.quit.dataset.confirm
  }

  el.quit.addEventListener('click', () => {
    const playing = isReady() && state.connections.player + state.connections.admin > 0
    if (playing && !quitArmed) {
      quitArmed = true
      el.quit.textContent = QUIT_CONFIRM_LABEL
      el.quit.dataset.confirm = 'true'
      clearTimeout(quitTimer)
      quitTimer = setTimeout(disarmQuit, 4000)
      return
    }
    disarmQuit()
    run('quit', undefined, 'Не удалось остановить игру')
  })

  el.toast.addEventListener('click', hideToast)

  document.addEventListener('contextmenu', event => {
    if (!(event.target instanceof Element) || !event.target.closest('.selectable')) {
      event.preventDefault()
    }
  })

  const start = async () => {
    render()
    if (!tauri || !tauri.core || !tauri.event) {
      showToast('Нет связи с приложением: окно открыто не из SI Game')
      return
    }
    let fresh = false
    try {
      await tauri.event.listen('launcher-state', event => {
        fresh = true
        apply(event.payload)
      })
    } catch (error) {
      showToast(`Не удалось подписаться на обновления: ${errorText(error)}`)
    }
    try {
      const initial = await call('get_state')
      if (!fresh) {
        apply(initial)
      }
    } catch (error) {
      showToast(`Не удалось получить состояние: ${errorText(error)}`)
    }
  }

  start()
})()
