const { execFileSync, execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const PKG_PACKAGE = '@yao-pkg/pkg@6.22.0'
const NODE_RANGE = 'node24'
const MIN_HOST_NODE_MAJOR = 22

const TARGETS = {
  win: { pkgTarget: `${NODE_RANGE}-win-x64`, output: 'sigame.exe', triple: 'x86_64-pc-windows-msvc' },
  'mac-arm64': { pkgTarget: `${NODE_RANGE}-macos-arm64`, output: 'sigame-macos-arm64', triple: 'aarch64-apple-darwin' },
  'mac-x64': { pkgTarget: `${NODE_RANGE}-macos-x64`, output: 'sigame-macos-x64', triple: 'x86_64-apple-darwin' },
}

const GROUPS = {
  win: ['win'],
  mac: ['mac-arm64', 'mac-x64'],
  'mac-arm64': ['mac-arm64'],
  'mac-x64': ['mac-x64'],
  all: ['win', 'mac-arm64', 'mac-x64'],
}

const FLAGS = new Set(['--sidecar', '--skip-build'])
const USAGE = 'Usage: node scripts/package.js <win|mac|mac-arm64|mac-x64|native|all> [--sidecar] [--skip-build]'

const root = path.resolve(__dirname, '..')
const releaseDir = path.join(root, 'release')
const sidecarDir = path.join(root, 'launcher', 'src-tauri', 'binaries')

const isMacTarget = name => name.startsWith('mac-')

const nativeTarget = () => {
  if (process.platform === 'darwin') {
    return process.arch === 'arm64' ? 'mac-arm64' : 'mac-x64'
  }

  if (process.platform === 'win32' && process.arch === 'x64') {
    return 'win'
  }

  return null
}

const sidecarPath = name => {
  const { triple } = TARGETS[name]
  const extension = triple.includes('windows') ? '.exe' : ''
  return path.join(sidecarDir, `sigame-server-${triple}${extension}`)
}

const run = command => {
  execSync(command, { cwd: root, stdio: 'inherit', shell: true })
}

const checkHostNode = () => {
  const hostNodeMajor = Number(process.versions.node.split('.')[0])
  if (hostNodeMajor < MIN_HOST_NODE_MAJOR) {
    throw new Error(`${PKG_PACKAGE} requires Node >= ${MIN_HOST_NODE_MAJOR}, current: ${process.version}`)
  }
}

const buildApp = () => {
  run('node scripts/build.js')
}

const signMacBinary = file => {
  if (process.platform !== 'darwin') {
    console.warn(`WARNING: ${path.basename(file)} is not signed — build macOS binaries on macOS (codesign is required on Apple Silicon).`)
    return
  }

  execFileSync('codesign', ['--force', '--sign', '-', file], { stdio: 'inherit' })
}

const archiveMacBinary = file => {
  execFileSync('tar', ['-czf', `${file}.tar.gz`, '-C', path.dirname(file), path.basename(file)], { stdio: 'inherit' })
}

const packageTarget = (name, { sidecar = false } = {}) => {
  const { pkgTarget, output } = TARGETS[name]
  const outputFile = sidecar ? sidecarPath(name) : path.join(releaseDir, output)
  fs.mkdirSync(path.dirname(outputFile), { recursive: true })
  run(`npx --yes --loglevel=error ${PKG_PACKAGE} package.json --targets ${pkgTarget} --no-bytecode --public --public-packages "*" --output "${outputFile}"`)

  if (isMacTarget(name)) {
    signMacBinary(outputFile)
    if (!sidecar) {
      archiveMacBinary(outputFile)
    }
  }

  console.log(`Created ${path.relative(root, outputFile)} (${pkgTarget})`)
  return outputFile
}

const resolveTargets = group => {
  if (group === 'native') {
    const name = nativeTarget()
    if (!name) {
      throw new Error(`No server target for this host (${process.platform}-${process.arch})`)
    }

    return [name]
  }

  return GROUPS[group] ?? null
}

const main = () => {
  const args = process.argv.slice(2)
  const positional = args.filter(arg => !arg.startsWith('--'))
  const flags = args.filter(arg => arg.startsWith('--'))
  const names = positional.length === 1 ? resolveTargets(positional[0]) : null
  if (!names || !flags.every(flag => FLAGS.has(flag))) {
    console.error(USAGE)
    process.exit(1)
  }

  checkHostNode()
  if (!flags.includes('--skip-build')) {
    buildApp()
  }

  for (const name of names) {
    packageTarget(name, { sidecar: flags.includes('--sidecar') })
  }
}

if (require.main === module) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

module.exports = { TARGETS, buildApp, checkHostNode, nativeTarget, packageTarget, sidecarPath }
