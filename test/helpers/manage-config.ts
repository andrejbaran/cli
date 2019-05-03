import { outputJson, readJson, remove } from 'fs-extra'
import * as path from 'path'

import { Config } from '../../src/types'

const configPath = path.resolve(__dirname, '../')

export async function clearConfig(): Promise<void> {
  return await remove(path.join(configPath, 'config.json'))
}

export async function readConfig(): Promise<Config> {
  return await readJson(path.join(configPath, 'config.json')).catch(() => {
    return {}
  })
}

export async function writeConfig(newConfig: Config): Promise<void> {
  return await outputJson(path.join(configPath, 'config.json'), newConfig)
}
