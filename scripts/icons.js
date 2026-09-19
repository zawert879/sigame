const { execFileSync, execSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { pathToFileURL } = require('url')

const TAURI_CLI = '@tauri-apps/cli@2'
const SIZE = 1024
const RENDER_TIMEOUT_MS = 60000

const root = path.resolve(__dirname, '..')
const iconsDir = path.join(root, 'launcher', 'src-tauri', 'icons')
const sourceSvg = path.join(iconsDir, 'source.svg')

const OUTPUTS = {
  mac: ['32x32.png', '128x128.png', '128x128@2x.png', 'icon.icns', 'icon.png'],
  win: ['icon.ico'],
}

const CHROME_CANDIDATES = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  win32: [
    path.join(process.env.PROGRAMFILES ?? 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ],
  linux: ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
}

const findChrome = () => {
  const candidates = [process.env.CHROME_PATH, ...(CHROME_CANDIDATES[process.platform] ?? [])].filter(Boolean)
  const chrome = candidates.find(file => fs.existsSync(file))
  if (!chrome) {
    throw new Error('Google Chrome or Microsoft Edge was not found: set CHROME_PATH')
  }

  return chrome
}

const replaceOnce = (text, search, replacement) => {
  if (!text.includes(search)) {
    throw new Error(`${path.relative(root, sourceSvg)} has no ${search}`)
  }

  return text.replace(search, replacement)
}

const VARIANTS = {
  mac: svg => svg,
  win: svg => replaceOnce(
    replaceOnce(svg, 'viewBox="0 0 1024 1024"', 'viewBox="96 96 832 832"'),
    '<g id="drop">',
    '<g id="drop" display="none">',
  ),
}

const render = (chrome, workDir, name, svg) => {
  const svgFile = path.join(workDir, `${name}.svg`)
  const htmlFile = path.join(workDir, `${name}.html`)
  const pngFile = path.join(workDir, `${name}.png`)
  fs.writeFileSync(svgFile, svg)
  fs.writeFileSync(htmlFile, `<!doctype html><html><head><style>html,body{margin:0;background:transparent}img{display:block;width:${SIZE}px;height:${SIZE}px}</style></head><body><img src="${name}.svg"></body></html>`)
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--default-background-color=00000000',
    `--window-size=${SIZE},${SIZE}`,
    `--screenshot=${pngFile}`,
    pathToFileURL(htmlFile).href,
  ]
  try {
    execFileSync(chrome, args, { stdio: 'ignore', timeout: RENDER_TIMEOUT_MS, killSignal: 'SIGKILL' })
  } catch (error) {
    if (!fs.existsSync(pngFile)) {
      throw error
    }
  }

  if (!fs.existsSync(pngFile)) {
    throw new Error(`${path.basename(chrome)} did not render ${name}.png`)
  }

  return pngFile
}

const main = () => {
  const chrome = findChrome()
  const source = fs.readFileSync(sourceSvg, 'utf8')
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sigame-icons-'))
  try {
    for (const [name, files] of Object.entries(OUTPUTS)) {
      const png = render(chrome, workDir, name, VARIANTS[name](source))
      const outDir = path.join(workDir, `${name}-icons`)
      try {
        execSync(`npx --yes --loglevel=error ${TAURI_CLI} icon "${png}" -o "${outDir}"`, { cwd: root, stdio: 'pipe', shell: true })
      } catch (error) {
        process.stderr.write(error.stderr ?? '')
        throw error
      }

      for (const file of files) {
        fs.copyFileSync(path.join(outDir, file), path.join(iconsDir, file))
        console.log(`Wrote ${path.relative(root, path.join(iconsDir, file))}`)
      }
    }
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true })
  }
}

main()
