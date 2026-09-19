import type { Server } from 'http'
import net from 'net'
import { APP_ID, type HealthInfo } from './appInfo'

export const FALLBACK_PORTS = Array.from({ length: 10 }, (_, index) => 4001 + index)

const PROBE_HOSTS = ['127.0.0.1', '0.0.0.0', '::1']
const PROBE_TIMEOUT = 700
const HEALTH_TIMEOUT = 2000
const RETRY_CODES = new Set(['EADDRINUSE', 'EACCES'])

export type ListenOptions = {
  port: number;
  isExplicit: boolean;
  host?: string;
  fallbackPorts?: number[];
  treatRunningAsBusy?: boolean;
}

type FirstFreeOptions = {
  host: string | undefined;
  treatRunningAsBusy: boolean;
}

export type ListenResult = {
  status: 'listening';
  port: number;
} | {
  status: 'running';
  port: number;
} | {
  status: 'failed';
  port: number;
  reason: 'busy' | 'sigame' | 'error';
  error?: NodeJS.ErrnoException;
}

const isHealthInfo = (value: unknown): value is HealthInfo => typeof value === 'object'
  && value !== null
  && (value as HealthInfo).app === APP_ID
  && typeof (value as HealthInfo).version === 'string'

export const isAcceptingConnections = async (port: number, host: string, timeout = PROBE_TIMEOUT): Promise<boolean> =>
  new Promise(resolve => {
    const socket = net.connect({ port, host })
    const finish = (isAccepting: boolean) => {
      socket.destroy()
      resolve(isAccepting)
    }

    socket.setTimeout(timeout, () => {
      finish(false)
    })
    socket.once('connect', () => {
      finish(true)
    })
    socket.once('error', () => {
      finish(false)
    })
  })

export const isPortBusy = async (port: number): Promise<boolean> => {
  const results = await Promise.all(PROBE_HOSTS.map(async host => isAcceptingConnections(port, host)))
  return results.includes(true)
}

export const readHealth = async (port: number, timeout = HEALTH_TIMEOUT): Promise<HealthInfo | null> => {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(timeout) })
    if (!response.ok) {
      return null
    }

    const body: unknown = await response.json()
    return isHealthInfo(body) ? body : null
  } catch {
    return null
  }
}

export const listenOn = async (server: Server, port: number, host?: string): Promise<number> =>
  new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      server.off('listening', onListening)
      reject(error)
    }

    const onListening = () => {
      server.off('error', onError)
      const address = server.address()
      resolve(typeof address === 'object' && address ? address.port : port)
    }

    server.once('error', onError)
    server.once('listening', onListening)
    if (host === undefined) {
      server.listen(port)
    } else {
      server.listen(port, host)
    }
  })

const toErrno = (error: unknown): NodeJS.ErrnoException => error instanceof Error ? error : new Error(String(error))

const listenExplicit = async (server: Server, port: number, host: string | undefined): Promise<ListenResult> => {
  if (port !== 0 && await isPortBusy(port)) {
    return { status: 'failed', port, reason: await readHealth(port) ? 'sigame' : 'busy' }
  }

  try {
    return { status: 'listening', port: await listenOn(server, port, host) }
  } catch (error) {
    return { status: 'failed', port, reason: 'error', error: toErrno(error) }
  }
}

const listenFirstFree = async (server: Server, candidates: number[], options: FirstFreeOptions, failure: ListenResult): Promise<ListenResult> => {
  const [candidate, ...rest] = candidates
  if (candidate === undefined) {
    return failure
  }

  if (candidate !== 0 && await isPortBusy(candidate)) {
    return !options.treatRunningAsBusy && await readHealth(candidate)
      ? { status: 'running', port: candidate }
      : listenFirstFree(server, rest, options, failure)
  }

  try {
    return { status: 'listening', port: await listenOn(server, candidate, options.host) }
  } catch (error) {
    const errno = toErrno(error)
    const result: ListenResult = { status: 'failed', port: candidate, reason: 'error', error: errno }
    return RETRY_CODES.has(errno.code ?? '') ? listenFirstFree(server, rest, options, result) : result
  }
}

export const listenSafely = async (server: Server, options: ListenOptions): Promise<ListenResult> => {
  const { port, isExplicit, host, fallbackPorts = FALLBACK_PORTS, treatRunningAsBusy = false } = options
  if (isExplicit || port === 0) {
    return listenExplicit(server, port, host)
  }

  const candidates = [...new Set([port, ...fallbackPorts]), 0]
  return listenFirstFree(server, candidates, { host, treatRunningAsBusy }, { status: 'failed', port, reason: 'busy' })
}

export const listenFailureMessage = (result: Extract<ListenResult, { status: 'failed' }>, url: string): string => {
  const { port } = result
  if (result.reason === 'sigame') {
    return `На порту ${port} уже запущена SI Game: ${url}. Открой её или запусти эту копию с другим PORT.`
  }

  if (result.reason === 'busy') {
    return `Порт ${port} уже занят другой программой. Закрой её или задай другой PORT.`
  }

  switch (result.error?.code) {
    case 'EADDRINUSE': {
      return `Порт ${port} уже занят. Закрой другую копию игры или задай другой PORT.`
    }

    case 'EACCES': {
      return `Система не разрешает открыть порт ${port} (EACCES). Задай другой PORT.`
    }

    default: {
      return `Не удалось открыть порт ${port}: ${result.error?.message ?? 'неизвестная ошибка'}`
    }
  }
}
