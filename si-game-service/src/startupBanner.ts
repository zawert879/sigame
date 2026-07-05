import os from 'os'
import qrcode from 'qrcode-terminal'

const PORT = 4000

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

export const printStartupBanner = (gameId: string) => {
  const lanIp = getLanCandidates()[0]?.address ?? null
  const qrHost = lanIp ?? '127.0.0.1'
  const qrUrl = `http://${qrHost}:${PORT}/player/${gameId}`

  console.log('')
  console.log('SI Game запущена')
  console.log(`Порт: ${PORT}`)
  console.log('')

  if (lanIp) {
    console.log(`Ссылка для локальной сети: http://${lanIp}:${PORT}`)
    console.log('QR для экрана игрока. Телефон/планшет должен быть в той же Wi-Fi/LAN сети:')
  } else {
    console.log('Адрес локальной сети не найден. QR работает только на этом компьютере:')
  }

  qrcode.generate(qrUrl, { small: true })

  console.log('')
  console.log('Краткая инструкция:')
  console.log('  1. Не закрывай это окно во время игры.')
  console.log('  2. Отсканируй QR на устройстве для показа игры.')
  console.log('  3. Для управления открой админку из интерфейса игры.')
  console.log('  4. Если другое устройство не подключается, разреши приложение в Windows Firewall.')
  console.log('')
}