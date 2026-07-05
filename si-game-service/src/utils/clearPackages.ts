import { rimrafSync } from 'rimraf'
import { packagesDir } from '../data'
import path from 'path'
import fs from 'fs'

export function clearPackages() {
  const files = fs.readdirSync(packagesDir)
  for (const file of files) {
    const filePath = path.join(packagesDir, file)
    rimrafSync(filePath)
  }
}

export function clearPackage(id: string) {
  rimrafSync(path.join(packagesDir, id))
}
