const { execSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { TARGETS, buildApp, checkHostNode, nativeTarget, packageTarget, sidecarPath } = require('./package')

const root = path.resolve(__dirname, '..')
const launcherDir = path.join(root, 'launcher')
const tauriDir = path.join(launcherDir, 'src-tauri')
const releaseDir = path.join(root, 'release')

const BUNDLES = {
  'mac-arm64': { host: 'darwin', bundle: 'dmg', extension: '.dmg', suffix: 'macos-arm64.dmg' },
  'mac-x64': { host: 'darwin', bundle: 'dmg', extension: '.dmg', suffix: 'macos-x64.dmg' },
  win: { host: 'win32', bundle: 'nsis', extension: '-setup.exe', suffix: 'windows-x64-setup.exe' },
}

const MODES = {
  mac: ['mac-arm64', 'mac-x64'],
  'mac-arm64': ['mac-arm64'],
  'mac-x64': ['mac-x64'],
  win: ['win'],
}

const HOST_NAMES = { darwin: 'macOS', win32: 'Windows' }
const FLAGS = new Set(['--skip-build', '--skip-sidecar'])
const USAGE = 'Usage: node scripts/launcher.js <mac|mac-arm64|mac-x64|win|dev> [--skip-build] [--skip-sidecar]'

const withCargoPath = env => {
  const cargoBin = path.join(os.homedir(), '.cargo', 'bin')
  const key = Object.keys(env).find(name => name.toUpperCase() === 'PATH') ?? 'PATH'
  const entries = (env[key] ?? '').split(path.delimiter)
  if (!fs.existsSync(cargoBin) || entries.includes(cargoBin)) {
    return env
  }

  return { ...env, [key]: [cargoBin, ...entries].join(path.delimiter) }
}

const run = (command, cwd = root) => {
  execSync(command, { cwd, env: withCargoPath(process.env), stdio: 'inherit', shell: true })
}

const readVersion = () => {
  const conf = JSON.parse(fs.readFileSync(path.join(tauriDir, 'tauri.conf.json'), 'utf8'))
  let { version } = conf
  if (typeof version === 'string' && version.endsWith('.json')) {
    ({ version } = JSON.parse(fs.readFileSync(path.resolve(tauriDir, version), 'utf8')))
  }

  if (!version) {
    const cargoToml = fs.readFileSync(path.join(tauriDir, 'Cargo.toml'), 'utf8')
    version = /^version\s*=\s*"([^"]+)"/m.exec(cargoToml)?.[1]
  }

  if (!version) {
    throw new Error(`No version in ${path.relative(root, path.join(tauriDir, 'tauri.conf.json'))}`)
  }

  return version
}

const ensureLauncherDependencies = () => {
  if (fs.existsSync(path.join(launcherDir, 'node_modules', '@tauri-apps', 'cli', 'package.json'))) {
    return
  }

  const frozen = fs.existsSync(path.join(launcherDir, 'yarn.lock')) ? ' --frozen-lockfile' : ''
  run(`yarn install${frozen}`, launcherDir)
}

const prepareSidecars = (names, flags) => {
  if (!flags.includes('--skip-build')) {
    buildApp()
  }

  for (const name of names) {
    if (flags.includes('--skip-sidecar')) {
      if (!fs.existsSync(sidecarPath(name))) {
        throw new Error(`${path.relative(root, sidecarPath(name))} not found: run without --skip-sidecar`)
      }
    } else {
      packageTarget(name, { sidecar: true })
    }
  }
}

const bundleDir = (name, bundle) => {
  const targetDir = process.env.CARGO_TARGET_DIR ? path.resolve(tauriDir, process.env.CARGO_TARGET_DIR) : path.join(tauriDir, 'target')
  return path.join(targetDir, TARGETS[name].triple, 'release', 'bundle', bundle)
}

const findBundle = (dir, extension, since) => {
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : []
  const fresh = files
    .filter(file => file.endsWith(extension))
    .map(file => ({ file: path.join(dir, file), mtime: fs.statSync(path.join(dir, file)).mtimeMs }))
    .filter(({ mtime }) => mtime >= since)
    .sort((a, b) => b.mtime - a.mtime)

  if (fresh.length === 0) {
    throw new Error(`tauri build produced no *${extension} in ${path.relative(root, dir)}`)
  }

  return fresh[0].file
}

const buildLauncher = (name, version) => {
  const { bundle, extension, suffix } = BUNDLES[name]
  const startedAt = Date.now() - 2000
  run(`yarn tauri build --target ${TARGETS[name].triple} --bundles ${bundle}`, launcherDir)

  const built = findBundle(bundleDir(name, bundle), extension, startedAt)
  const target = path.join(releaseDir, `SI-Game-${version}-${suffix}`)
  fs.mkdirSync(releaseDir, { recursive: true })
  fs.copyFileSync(built, target)
  console.log(`Created ${path.relative(root, target)} (${path.basename(built)})`)
}

const buildRelease = (names, flags) => {
  for (const name of names) {
    const { host } = BUNDLES[name]
    if (process.platform !== host) {
      throw new Error(`The ${name} launcher can only be built on ${HOST_NAMES[host]}: Tauri does not cross-compile, current host is ${process.platform}-${process.arch}`)
    }
  }

  const version = readVersion()
  prepareSidecars(names, flags)
  ensureLauncherDependencies()
  for (const name of names) {
    buildLauncher(name, version)
  }
}

const runDev = flags => {
  const name = nativeTarget()
  if (!name) {
    throw new Error(`No launcher target for this host (${process.platform}-${process.arch})`)
  }

  prepareSidecars([name], flags)
  ensureLauncherDependencies()
  run('yarn tauri dev', launcherDir)
}

const main = () => {
  const args = process.argv.slice(2)
  const positional = args.filter(arg => !arg.startsWith('--'))
  const flags = args.filter(arg => arg.startsWith('--'))
  const [mode] = positional
  if (positional.length !== 1 || !(mode === 'dev' || MODES[mode]) || !flags.every(flag => FLAGS.has(flag))) {
    console.error(USAGE)
    process.exit(1)
  }

  checkHostNode()
  if (mode === 'dev') {
    runDev(flags)
  } else {
    buildRelease(MODES[mode], flags)
  }
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
