import packageJson from '../package.json'

export const APP_ID = 'sigame'

export const APP_VERSION: string = packageJson.version

export type HealthInfo = {
  app: string;
  version: string;
}

export const healthInfo = (): HealthInfo => ({ app: APP_ID, version: APP_VERSION })
