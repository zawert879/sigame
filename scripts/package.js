const { execFileSync, execSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const PKG_PACKAGE = '@yao-pkg/pkg@6.22.0'
const PKG_FETCH_PACKAGE = '@yao-pkg/pkg-fetch@3.6.5'
const RESEDIT_PACKAGE = 'resedit-cli@3.1.1'
const APP_NAME = 'SI Game'
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
const windowsIcon = path.join(root, 'launcher', 'src-tauri', 'icons', 'icon.ico')

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

const run = (command, env = process.env) => {
  execSync(command, { cwd: root, stdio: 'inherit', shell: true, env })
}

const serverVersion = () =>
  JSON.parse(fs.readFileSync(path.join(root, 'si-game-service', 'package.json'), 'utf8')).version

const windowsFileVersion = version => {
  const parts = version.split(/[.+-]/).map(Number).filter(Number.isInteger).slice(0, 3)
  while (parts.length < 4) {
    parts.push(0)
  }

  return parts.join('.')
}

const fetchBaseBinary = pkgTarget => {
  const [range, platform, arch] = pkgTarget.split('-')
  const output = execSync(`npx --yes --loglevel=error ${PKG_FETCH_PACKAGE} -n ${range} -p ${platform} -a ${arch}`, {
    cwd: root,
    encoding: 'utf8',
    shell: true,
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  const match = /^> (.+)$/m.exec(output)
  const file = match?.[1].trim()
  if (!file || !fs.existsSync(file)) {
    throw new Error(`${PKG_FETCH_PACKAGE} did not report the ${pkgTarget} base binary:\n${output}`)
  }

  return file
}

const brandWindowsBase = (pkgTarget, outputFile) => {
  const base = fetchBaseBinary(pkgTarget)
  const branded = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sigame-base-')), `${path.basename(base)}.exe`)
  const version = windowsFileVersion(serverVersion())
  const name = path.basename(outputFile)
  run([
    `npx --yes --loglevel=error ${RESEDIT_PACKAGE}`,
    `--in "${base}" --out "${branded}" --ignore-signed --allow-shrink --lang 1033`,
    `--company-name "${APP_NAME}" --product-name "${APP_NAME}" --file-description "${APP_NAME}"`,
    `--internal-name "${path.parse(name).name}" --original-filename "${name}"`,
    `--file-version ${version} --product-version ${version}`,
    `--delete-allicon --icon "1,${windowsIcon}"`,
  ].join(' '))
  return branded
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
  const env = isMacTarget(name) ? process.env : { ...process.env, PKG_NODE_PATH: brandWindowsBase(pkgTarget, outputFile) }
  run(`npx --yes --loglevel=error ${PKG_PACKAGE} package.json --targets ${pkgTarget} --no-bytecode --public --public-packages "*" --output "${outputFile}"`, env)

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
