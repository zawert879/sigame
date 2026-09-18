import os from 'os'
import qrcode from 'qrcode-terminal'

type LanCandidate = {
  address: string;
  name: string;
  score: number;
}

const isPrivateRouterIp = (address: string): boolean => {
  if (address.startsWith('10.')) {
    return true
  }

  if (address.startsWith('192.168.')) {
    return true
  }

  const parts = address.split('.').map(Number)
  return parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31
}

const getLanCandidates = (): LanCandidate[] => {
  const interfaces = os.networkInterfaces()
  const candidates: LanCandidate[] = []

  for (const [name, items] of Object.entries(interfaces)) {
    const lowerName = name.toLowerCase()
    const looksVirtual = [
      'virtual',
      'vpn',
      'tap',
      'tun',
      'wintun',
      'wireguard',
      'tailscale',
      'zerotier',
      'openvpn',
      'hamachi',
      'radmin',
      'vethernet',
      'hyper-v',
      'vmware',
      'virtualbox',
      'npcap',
      'loopback',
    ].some(pattern => lowerName.includes(pattern))

    for (const item of items ?? []) {
      if (item.family !== 'IPv4' || item.internal || item.address.startsWith('169.254.') || !isPrivateRouterIp(item.address)) {
        continue
      }

      let score = 0
      if (item.address.startsWith('192.168.')) {
        score += 300
      } else if (item.address.startsWith('172.')) {
        score += 200
      } else if (item.address.startsWith('10.')) {
        score += 100
      }

      if (item.address.startsWith('10.8.') || item.address.startsWith('10.9.')) {
        score -= 60
      }

      if (looksVirtual) {
        score -= 500
      }

      candidates.push({ address: item.address, name, score })
    }
  }

  return candidates.sort((a, b) => b.score - a.score)
}

// The QR opens '/', which redirects to the first game, so it stays valid after «Выход» recreates the game.
// With an admin token the link carries it: the device that opens it gets admin rights.
// siqDir: where the uploaded packs are stored (it is not the working directory of the desktop build).
export const printStartupBanner = (port: number, adminToken: string | null, siqDir: string) => {
  const lanIp = getLanCandidates()[0]?.address ?? null
  const host = lanIp ?? '127.0.0.1'
  const tokenQuery = adminToken ? `?token=${encodeURIComponent(adminToken)}` : ''
  const qrUrl = `http://${host}:${port}/${tokenQuery}`

  console.log('')
  console.log('SI Game запущена')
  console.log(`Порт: ${port}`)
  console.log(adminToken ? 'Управление игрой: только с admin-токеном (ADMIN_TOKEN)' : 'Управление игрой: открыто для всех в сети')
  console.log(`Паки: ${siqDir}`)
  console.log('')

  if (lanIp) {
    console.log(`Ссылка для локальной сети: ${qrUrl}`)
    console.log('QR для подключения устройства. Телефон/планшет должен быть в той же Wi-Fi/LAN сети:')
  } else {
    console.log(`Адрес локальной сети не найден. Ссылка работает только на этом компьютере: ${qrUrl}`)
  }

  qrcode.generate(qrUrl, { small: true })

  if (adminToken) {
    console.log('Ссылка и QR содержат admin-токен — не показывай их игрокам.')
  }

  console.log('')
  console.log('Краткая инструкция:')
  console.log('  1. Не закрывай это окно во время игры.')
  console.log('  2. Отсканируй QR на устройстве для показа игры.')
  console.log('  3. Для управления открой админку из интерфейса игры.')
  console.log(`  4. Если другое устройство не подключается, ${firewallHint()}`)
  console.log('')
}

const firewallHint = (): string => {
  if (process.platform === 'darwin') {
    return 'разреши входящие подключения для sigame: Системные настройки → Сеть → Файрвол.'
  }

  if (process.platform === 'win32') {
    return 'разреши приложение в Windows Firewall.'
  }

  return 'проверь, что файрвол пропускает входящие подключения на этот порт.'
}
