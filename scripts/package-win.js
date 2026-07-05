const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const releaseDir = path.join(root, 'release')
const outputExe = path.join(releaseDir, 'sigame.exe')

const run = (command) => {
  execSync(command, { cwd: root, stdio: 'inherit', shell: true })
}

run('node scripts/build.js')
fs.mkdirSync(releaseDir, { recursive: true })
run(`npx --yes pkg@5.8.1 package.json --targets node16-win-x64 --output "${outputExe}"`)
console.log(`Created ${path.relative(root, outputExe)}`)