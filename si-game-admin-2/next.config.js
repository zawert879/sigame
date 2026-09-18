const { PHASE_PRODUCTION_BUILD } = require('next/constants')

const ANTD_ES_DEEP_IMPORT = /^((?:rc-[\w-]+|@rc-component\/[\w-]+|@ant-design\/[\w-]+)\/)es\//

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  experimental: {
    externalDir: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      const externals = Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)
      config.externals = [
        ({ request }, callback) => {
          if (request && ANTD_ES_DEEP_IMPORT.test(request)) {
            return callback(null, `commonjs ${request.replace(ANTD_ES_DEEP_IMPORT, '$1lib/')}`)
          }
          return callback()
        },
        ...externals,
      ]
    }
    return config
  },
}

module.exports = (phase) => {
  const serverUrl = (process.env.NEXT_PUBLIC_SERVER_URL ?? '').trim()
  if (phase === PHASE_PRODUCTION_BUILD && serverUrl && !process.env.SIGAME_SERVER_URL_WARNED) {
    process.env.SIGAME_SERVER_URL_WARNED = '1'
    console.warn(
      `Warning: NEXT_PUBLIC_SERVER_URL=${serverUrl} is baked into this build: every device will call that address `
      + 'instead of the page origin. Unless that is intended, move it to .env.development.local (read by `next dev` '
      + 'only) and build again.',
    )
  }
  return nextConfig
}
