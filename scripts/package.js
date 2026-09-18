const { execFileSync, execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const PKG_PACKAGE = '@yao-pkg/pkg@6.22.0'
const NODE_RANGE = 'node24'
const MIN_HOST_NODE_MAJOR = 22

const TARGETS = {
  win: [
    { target: `${NODE_RANGE}-win-x64`, output: 'sigame.exe' },
  ],
  mac: [
    { target: `${NODE_RANGE}-macos-arm64`, output: 'sigame-macos-arm64' },
    { target: `${NODE_RANGE}-macos-x64`, output: 'sigame-macos-x64' },
  ],
}

const root = path.resolve(__dirname, '..')
const releaseDir = path.join(root, 'release')

const platformArg = process.argv[2]
const platforms = platformArg === 'all' ? Object.keys(TARGETS) : [platformArg]
if (!platforms.every(platform => TARGETS[platform])) {
  console.error('Usage: node scripts/package.js <win|mac|all>')
  process.exit(1)
}

const hostNodeMajor = Number(process.versions.node.split('.')[0])
if (hostNodeMajor < MIN_HOST_NODE_MAJOR) {
  throw new Error(`${PKG_PACKAGE} requires Node >= ${MIN_HOST_NODE_MAJOR}, current: ${process.version}`)
}

const run = command => {
  execSync(command, { cwd: root, stdio: 'inherit', shell: true })
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

run('node scripts/build.js')
fs.mkdirSync(releaseDir, { recursive: true })

for (const platform of platforms) {
  for (const { target, output } of TARGETS[platform]) {
    const outputFile = path.join(releaseDir, output)
    run(`npx --yes --loglevel=error ${PKG_PACKAGE} package.json --targets ${target} --no-bytecode --public --public-packages "*" --output "${outputFile}"`)

    if (platform === 'mac') {
      signMacBinary(outputFile)
      archiveMacBinary(outputFile)
    }

    console.log(`Created ${path.relative(root, outputFile)} (${target})`)
  }
}
