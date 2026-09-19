import type { EnvironmentContext, JestEnvironmentConfig } from '@jest/environment'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { TestEnvironment } from 'jest-environment-node'

export default class SigameTestEnvironment extends TestEnvironment {
  private readonly _root: string

  constructor(config: JestEnvironmentConfig, context: EnvironmentContext) {
    super(config, context)
    this._root = fs.mkdtempSync(path.join(os.tmpdir(), 'sigame-test-'))

    const { env } = this.global.process
    env.SIGAME_TEST_ROOT = this._root
    env.SIQ_DIR = path.join(this._root, 'siq')
    env.PACKAGES_DIR = path.join(this._root, 'packages')
    env.FRONTEND_STATIC_DIR = path.join(this._root, 'public')
    delete env.ADMIN_TOKEN
    delete env.PORT
    delete env.SIGAME_LAUNCHER

    fs.mkdirSync(env.SIQ_DIR)
    fs.mkdirSync(env.PACKAGES_DIR)
  }

  override async teardown(): Promise<void> {
    await super.teardown()
    fs.rmSync(this._root, { recursive: true, force: true })
  }
}
