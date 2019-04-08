import {outputJson, readJson, remove} from 'fs-extra'
import * as path from 'path'

import {Config} from '../../src/types/config'

const configPath = path.resolve(__dirname, '../')

export async function clearConfig(): Promise<void> {
  return Promise.resolve(
    await remove(path.join(configPath, 'config.json'))
  )
}

export async function readConfig(): Promise<Config> {
  return Promise.resolve(
    await readJson(path.join(configPath, 'config.json'))
      .catch(() => {
        return {}
      })
  )
}
export async function writeConfig(newConfig: object): Promise<void> {
  return Promise.resolve(
    await outputJson(path.join(configPath, 'config.json'), newConfig)
  )
}
