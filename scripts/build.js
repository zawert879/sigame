const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const adminDir = path.join(root, 'si-game-admin-2')
const serviceDir = path.join(root, 'si-game-service')
const frontendOutDir = path.join(adminDir, 'out')
const servicePublicDir = path.join(serviceDir, 'dist', 'public')

const run = (command, cwd) => {
  execSync(command, { cwd, stdio: 'inherit', shell: true })
}

const copyDir = (source, target) => {
  fs.rmSync(target, { recursive: true, force: true })
  fs.mkdirSync(target, { recursive: true })
  fs.cpSync(source, target, { recursive: true })
}

run('yarn build', adminDir)
run('yarn build', serviceDir)

if (!fs.existsSync(frontendOutDir)) {
  throw new Error(`Frontend build output was not found: ${frontendOutDir}`)
}

copyDir(frontendOutDir, servicePublicDir)
console.log(`Copied frontend static files to ${path.relative(root, servicePublicDir)}`)