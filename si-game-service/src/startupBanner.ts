import os from 'os'
import qrcode from 'qrcode-terminal'

export type LanCandidate = {
  address: string;
  name: string;
  score: number;
}

export type StartupLinks = {
  host: string;
  isLan: boolean;
  tvUrl: string;
  adminUrl: string;
  others: string[];
}

type NetworkInterfaces = NodeJS.Dict<os.NetworkInterfaceInfo[]>

const VIRTUAL_INTERFACE = /utun|tun|tap|wg|bridge|vmnet|vmenet|vboxnet|docker|br-|veth|awdl|llw|vethernet|virtualbox|vmware|hyper-v|tailscale|zerotier|hamachi|radmin|virtual|vpn|wireguard|npcap|loopback/i
const MAC_PRIMARY_INTERFACE = /^en[01]$/
const LOCALHOST = '127.0.0.1'

const octetsOf = (address: string): number[] | null => {
  const octets = address.split('.').map(Number)
  return octets.length === 4 && octets.every(octet => Number.isInteger(octet) && octet >= 0 && octet <= 255) ? octets : null
}

const isUnusable = ([first, second]: number[]): boolean => (first === 169 && second === 254)
  || (first === 100 && second >= 64 && second <= 127)
  || first === 127
  || first === 0
  || first >= 224

const addressScore = ([first, second]: number[]): number => {
  if (first === 192 && second === 168) {
    return 300
  }

  if (first === 172 && second >= 16 && second <= 31) {
    return 200
  }

  if (first === 10) {
    return second === 8 || second === 9 ? 40 : 100
  }

  return 0
}

const isHostRoute = (item: os.NetworkInterfaceInfo): boolean => item.netmask === '255.255.255.255' || item.cidr?.endsWith('/32') === true

export const getLanCandidates = (
  interfaces: NetworkInterfaces = os.networkInterfaces(),
  platform: NodeJS.Platform = process.platform,
): LanCandidate[] => {
  const candidates: LanCandidate[] = []
  for (const [name, items] of Object.entries(interfaces)) {
    const isVirtual = VIRTUAL_INTERFACE.test(name)
    const isMacPrimary = platform === 'darwin' && MAC_PRIMARY_INTERFACE.test(name)
    for (const item of items ?? []) {
      const octets = item.family === 'IPv4' && !item.internal ? octetsOf(item.address) : null
      if (!octets || isUnusable(octets)) {
        continue
      }

      let score = addressScore(octets)
      if (isVirtual) {
        score -= 500
      }

      if (isHostRoute(item)) {
        score -= 400
      }

      if (octets[3] === 1) {
        score -= 150
      }

      if (isMacPrimary) {
        score += 50
      }

      candidates.push({ address: item.address, name, score })
    }
  }

  return candidates.sort((a, b) => b.score - a.score)
}

const serverUrl = (host: string, port: number, pathname = '/'): string => `http://${host}:${port}${pathname}`

export const tvUrl = (port: number, candidates: LanCandidate[] = getLanCandidates()): string =>
  serverUrl(candidates[0]?.address ?? LOCALHOST, port)

export const startupLinks = (port: number, adminToken: string | null, candidates: LanCandidate[]): StartupLinks => {
  const [best, ...rest] = candidates
  const host = best?.address ?? LOCALHOST
  const tokenQuery = adminToken ? `?token=${encodeURIComponent(adminToken)}` : ''
  return {
    host,
    isLan: best !== undefined,
    tvUrl: serverUrl(host, port),
    adminUrl: `${serverUrl(host, port, '/admin/')}${tokenQuery}`,
    others: rest.map(candidate => `${serverUrl(candidate.address, port)} (${candidate.name})`),
  }
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

export const printStartupBanner = (port: number, adminToken: string | null, siqDir: string, candidates: LanCandidate[] = getLanCandidates()) => {
  const links = startupLinks(port, adminToken, candidates)

  console.log('')
  console.log('SI Game запущена')
  console.log(`Порт: ${port}`)
  console.log(adminToken ? 'Управление игрой: только с admin-токеном (ADMIN_TOKEN)' : 'Управление игрой: открыто для всех в сети')
  console.log(`Паки: ${siqDir}`)
  console.log('')

  if (!links.isLan) {
    console.log('Адрес локальной сети не найден: ссылки работают только на этом компьютере.')
  }

  console.log(`Экран игры (телевизор, проектор): ${links.tvUrl}`)
  if (links.isLan) {
    console.log('QR для экрана игры. Устройство должно быть в той же Wi-Fi/LAN сети:')
  }

  qrcode.generate(links.tvUrl, { small: true })

  console.log(`Пульт ведущего: ${links.adminUrl}`)
  if (adminToken) {
    console.log('Ссылка пульта содержит admin-токен — не показывай её игрокам.')
  }

  if (links.others.length > 0) {
    console.log(`Другие адреса: ${links.others.join(', ')}`)
  }

  console.log('')
  console.log('Краткая инструкция:')
  console.log('  1. Не закрывай это окно во время игры.')
  console.log('  2. Открой ссылку экрана игры или отсканируй QR на устройстве для показа.')
  console.log('  3. Ведущий открывает ссылку пульта на своём компьютере или телефоне.')
  console.log(`  4. Если другое устройство не подключается, ${firewallHint()}`)
  console.log('')
}
