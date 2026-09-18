import type { EnvironmentContext, JestEnvironmentConfig } from '@jest/environment'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { TestEnvironment } from 'jest-environment-node'

// Node environment with private runtime directories for each test file.
// src/config.ts reads SIQ_DIR, PACKAGES_DIR, FRONTEND_STATIC_DIR and ADMIN_TOKEN once, at import time: they are set
// here, before the test file loads any application module, so no test touches si-game-service/siq or packages.
// The directory is removed after the whole file, i.e. after its afterAll hooks too.
export default class SigameTestEnvironment extends TestEnvironment {
  private readonly _root: string

  constructor(config: JestEnvironmentConfig, context: EnvironmentContext) {
    super(config, context)
    this._root = fs.mkdtempSync(path.join(os.tmpdir(), 'sigame-test-'))

    const { env } = this.global.process
    env.SIGAME_TEST_ROOT = this._root
    env.SIQ_DIR = path.join(this._root, 'siq')
    env.PACKAGES_DIR = path.join(this._root, 'packages')
    // does not exist: no static frontend unless a test creates one
    env.FRONTEND_STATIC_DIR = path.join(this._root, 'public')
    delete env.ADMIN_TOKEN
    delete env.PORT

    fs.mkdirSync(env.SIQ_DIR)
    fs.mkdirSync(env.PACKAGES_DIR)
  }

  override async teardown(): Promise<void> {
    await super.teardown()
    fs.rmSync(this._root, { recursive: true, force: true })
  }
}
