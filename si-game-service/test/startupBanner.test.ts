import type os from 'os'
import qrcode from 'qrcode-terminal'
import { getLanCandidates, printStartupBanner, startupLinks, tvUrl, type LanCandidate } from '../src/startupBanner'

type Interfaces = NodeJS.Dict<os.NetworkInterfaceInfo[]>

const maskBits = (netmask: string): number => netmask.split('.')
  .map(octet => Number(octet).toString(2))
  .join('')
  .split('')
  .filter(bit => bit === '1')
  .length

const ipv4 = (address: string, netmask = '255.255.255.0', internal = false): os.NetworkInterfaceInfo => ({
  address,
  netmask,
  family: 'IPv4',
  mac: '00:00:00:00:00:00',
  internal,
  cidr: `${address}/${maskBits(netmask)}`,
})

const ipv6 = (address: string): os.NetworkInterfaceInfo => ({
  address,
  netmask: 'ffff:ffff:ffff:ffff::',
  family: 'IPv6',
  mac: '00:00:00:00:00:00',
  internal: false,
  cidr: `${address}/64`,
  scopeid: 0,
})

const addresses = (interfaces: Interfaces, platform: NodeJS.Platform = 'linux'): string[] =>
  getLanCandidates(interfaces, platform).map(candidate => candidate.address)

const candidate = (address: string, name: string): LanCandidate => ({ address, name, score: 0 })

describe('getLanCandidates', () => {
  test('a typical Mac with VPN, VMs and Docker: the Wi-Fi address first, unusable addresses dropped', () => {
    const interfaces: Interfaces = {
      lo0: [ipv4('127.0.0.1', '255.0.0.0', true), ipv6('::1')],
      utun3: [ipv4('10.8.0.6', '255.255.255.255')],
      bridge100: [ipv4('192.168.64.1')],
      vmnet8: [ipv4('172.16.5.1')],
      docker0: [ipv4('172.17.0.1', '255.255.0.0')],
      tailscale0: [ipv4('100.101.1.2', '255.255.255.255')],
      en5: [ipv4('169.254.3.4', '255.255.0.0')],
      awdl0: [ipv6('fe80::1')],
      en0: [ipv6('fe80::abcd'), ipv4('192.168.1.23')],
      en8: [ipv4('10.0.0.15')],
    }

    const result = getLanCandidates(interfaces, 'darwin')
    expect(result.map(item => item.address)).toEqual(['192.168.1.23', '10.0.0.15', '192.168.64.1', '172.16.5.1', '172.17.0.1', '10.8.0.6'])
    expect(result[0]).toEqual({ address: '192.168.1.23', name: 'en0', score: expect.any(Number) as number })
    expect(result.map(item => item.score)).toEqual([...result.map(item => item.score)].sort((a, b) => b - a))
  })

  test.each([
    'utun4',
    'tun0',
    'tap0',
    'wg0',
    'bridge100',
    'vmnet8',
    'vmenet0',
    'vboxnet0',
    'docker0',
    'br-1a2b3c4d',
    'veth12ab',
    'awdl0',
    'llw0',
    'vEthernet (Default Switch)',
    'VirtualBox Host-Only Network',
    'VMware Network Adapter VMnet1',
    'Hyper-V Virtual Ethernet Adapter',
    'Tailscale',
    'ZeroTier One [8056c2e21c]',
    'Hamachi',
    'Radmin VPN',
    'OpenVPN Wintun',
  ])('a virtual adapter "%s" loses even with a better address class', name => {
    expect(addresses({ [name]: [ipv4('192.168.7.10')], eth0: [ipv4('10.1.2.3')] })).toEqual(['10.1.2.3', '192.168.7.10'])
  })

  test.each(['Ethernet', 'Wi-Fi', 'Беспроводная сеть', 'eth0', 'wlan0', 'enp3s0', 'en0'])('a physical adapter "%s" is not penalised', name => {
    expect(addresses({ [name]: [ipv4('192.168.7.10')], eth0x: [ipv4('10.1.2.3')] })).toEqual(['192.168.7.10', '10.1.2.3'])
  })

  test('a /32 netmask (point-to-point, VPN) loses', () => {
    expect(addresses({ eth1: [ipv4('192.168.1.5', '255.255.255.255')], eth0: [ipv4('10.0.0.5')] })).toEqual(['10.0.0.5', '192.168.1.5'])
    const withoutCidr = { ...ipv4('192.168.1.5', '255.255.255.255'), cidr: null }
    expect(addresses({ eth1: [withoutCidr], eth0: [ipv4('10.0.0.5')] })).toEqual(['10.0.0.5', '192.168.1.5'])
  })

  test('an address ending in .1 (a router or a host-only adapter) loses to another private address', () => {
    expect(addresses({ eth0: [ipv4('192.168.56.1')], eth1: [ipv4('172.20.10.4')] })).toEqual(['172.20.10.4', '192.168.56.1'])
    expect(addresses({ eth0: [ipv4('192.168.56.1')], eth1: [ipv4('192.168.56.11')] })).toEqual(['192.168.56.11', '192.168.56.1'])
  })

  test('private classes: 192.168/16 before 172.16/12 before 10/8; OpenVPN 10.8/10.9 after other 10/8', () => {
    expect(addresses({
      a: [ipv4('10.8.0.2')],
      b: [ipv4('10.0.0.2')],
      c: [ipv4('172.16.0.2')],
      d: [ipv4('192.168.0.2')],
      e: [ipv4('172.32.0.2')],
      f: [ipv4('10.9.0.2')],
    })).toEqual(['192.168.0.2', '172.16.0.2', '10.0.0.2', '10.8.0.2', '10.9.0.2', '172.32.0.2'])
  })

  test('link-local 169.254/16 and CGNAT 100.64/10 are dropped, loopback and IPv6 are skipped', () => {
    expect(addresses({
      a: [ipv4('169.254.10.20', '255.255.0.0')],
      b: [ipv4('100.64.0.1', '255.192.0.0')],
      c: [ipv4('100.127.255.254', '255.192.0.0')],
      d: [ipv4('100.63.0.5')],
      e: [ipv4('100.128.0.5')],
      f: [ipv4('127.0.0.1', '255.0.0.0', true)],
      g: [ipv6('fe80::1'), ipv6('2001:db8::5')],
      h: undefined,
    })).toEqual(['100.63.0.5', '100.128.0.5'])
  })

  test('en0 / en1 get a small bonus on macOS only', () => {
    const interfaces: Interfaces = { en7: [ipv4('192.168.1.5')], en1: [ipv4('192.168.1.6')], en10: [ipv4('192.168.1.7')] }
    expect(addresses(interfaces, 'darwin')).toEqual(['192.168.1.6', '192.168.1.5', '192.168.1.7'])
    expect(addresses(interfaces, 'win32')).toEqual(['192.168.1.5', '192.168.1.6', '192.168.1.7'])
    expect(addresses({ en0: [ipv4('10.0.0.5')], eth0: [ipv4('192.168.1.5')] }, 'darwin')).toEqual(['192.168.1.5', '10.0.0.5'])
  })

  test('reads the interfaces of this computer by default', () => {
    for (const item of getLanCandidates()) {
      expect(item.address).toMatch(/^\d+\.\d+\.\d+\.\d+$/)
      expect(item.address).not.toMatch(/^(127|169\.254)\./)
    }
  })
})

describe('startup links', () => {
  const candidates = [candidate('192.168.1.23', 'en0'), candidate('10.0.0.15', 'en8'), candidate('172.17.0.1', 'docker0')]

  test('the TV link never has the token, the host link is /admin/ with the token', () => {
    expect(startupLinks(4001, 'se cret&x', candidates)).toEqual({
      host: '192.168.1.23',
      isLan: true,
      tvUrl: 'http://192.168.1.23:4001/',
      adminUrl: 'http://192.168.1.23:4001/admin/?token=se%20cret%26x',
      others: ['http://10.0.0.15:4001/ (en8)', 'http://172.17.0.1:4001/ (docker0)'],
    })
    expect(startupLinks(4000, null, candidates.slice(0, 1))).toEqual({
      host: '192.168.1.23',
      isLan: true,
      tvUrl: 'http://192.168.1.23:4000/',
      adminUrl: 'http://192.168.1.23:4000/admin/',
      others: [],
    })
  })

  test('without a LAN address the links point to this computer', () => {
    expect(startupLinks(4000, 't', [])).toEqual({
      host: '127.0.0.1',
      isLan: false,
      tvUrl: 'http://127.0.0.1:4000/',
      adminUrl: 'http://127.0.0.1:4000/admin/?token=t',
      others: [],
    })
    expect(tvUrl(4005, [])).toBe('http://127.0.0.1:4005/')
    expect(tvUrl(4005, candidates)).toBe('http://192.168.1.23:4005/')
  })
})

describe('printStartupBanner', () => {
  const printed = (run: () => void): { lines: string[]; qr: string[] } => {
    const log = jest.mocked(console.log)
    log.mockClear()
    const generate = jest.spyOn(qrcode, 'generate').mockImplementation(() => undefined)
    try {
      run()
      return { lines: log.mock.calls.map(call => call.map(String).join(' ')), qr: generate.mock.calls.map(call => call[0]) }
    } finally {
      generate.mockRestore()
    }
  }

  test('with a token: the QR and the TV link have no token, the host link has it', () => {
    const { lines, qr } = printed(() => {
      printStartupBanner(4003, 'tok', '/data/siq', [candidate('192.168.1.23', 'en0'), candidate('10.0.0.15', 'en8')])
    })

    expect(qr).toEqual(['http://192.168.1.23:4003/'])
    expect(lines).toContain('Порт: 4003')
    expect(lines).toContain('Паки: /data/siq')
    expect(lines).toContain('Экран игры (телевизор, проектор): http://192.168.1.23:4003/')
    expect(lines).toContain('Пульт ведущего: http://192.168.1.23:4003/admin/?token=tok')
    expect(lines).toContain('Другие адреса: http://10.0.0.15:4003/ (en8)')
    expect(lines.filter(line => line.includes('tok'))).toEqual(['Пульт ведущего: http://192.168.1.23:4003/admin/?token=tok'])
    expect(lines.some(line => line.includes('admin-токен'))).toBe(true)
  })

  test('without a token and with one address: no token warning, no other addresses', () => {
    const { lines, qr } = printed(() => {
      printStartupBanner(4000, null, '/data/siq', [candidate('192.168.1.23', 'en0')])
    })

    expect(qr).toEqual(['http://192.168.1.23:4000/'])
    expect(lines).toContain('Пульт ведущего: http://192.168.1.23:4000/admin/')
    expect(lines.some(line => line.includes('token'))).toBe(false)
    expect(lines.some(line => line.startsWith('Другие адреса'))).toBe(false)
    expect(lines.some(line => line.includes('Адрес локальной сети не найден'))).toBe(false)
  })

  test('without a LAN address: localhost links and a hint', () => {
    const { lines, qr } = printed(() => {
      printStartupBanner(4000, null, '/data/siq', [])
    })

    expect(qr).toEqual(['http://127.0.0.1:4000/'])
    expect(lines.some(line => line.includes('Адрес локальной сети не найден'))).toBe(true)
    expect(lines).toContain('Пульт ведущего: http://127.0.0.1:4000/admin/')
  })
})
