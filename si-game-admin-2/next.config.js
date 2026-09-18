const { PHASE_PRODUCTION_BUILD } = require('next/constants')

// Deep imports of antd's dependencies from their ES builds, e.g. `rc-util/es/Dom/dynamicCSS`.
const ANTD_ES_DEEP_IMPORT = /^((?:rc-[\w-]+|@rc-component\/[\w-]+|@ant-design\/[\w-]+)\/)es\//

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  // common/ lives outside the app dir and contains runtime enums (common/data.ts)
  experimental: {
    externalDir: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Next rewrites `import { Button } from 'antd'` to antd's ES modules (default optimizePackageImports), which
      // deep-import `rc-*/es/...` and `@ant-design/*/es/...`. Next leaves those imports external, but they are ES
      // modules without "type": "module", so Node cannot require() them while the pages are prerendered.
      // On the server require their CommonJS twins from `lib/`; the browser bundle keeps the ES modules.
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
  // NEXT_PUBLIC_SERVER_URL is inlined into the bundle. It is meant for `next dev` (.env.development.local); the static
  // export is served by si-game-service and must use the page origin. Next also reads .env.local / .env for
  // `next build`, so a dev setup there silently points the release build at e.g. http://localhost:4000.
  // (Next loads this file more than once per build: warn once, the flag is inherited by its workers)
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
