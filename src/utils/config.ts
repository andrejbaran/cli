/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 6th August 2019 3:07:48 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 4th September 2019 3:19:11 pm
 * @copyright (c) 2019 CTO.ai
 */

import Debug from 'debug'
import { outputJson, readJson, remove } from 'fs-extra'
import * as path from 'path'
import { NODE_ENV, OPS_DEBUG, OPS_REGISTRY_HOST } from '../constants/env'
import { Config, SigninPipeline, Team } from '../types'

const debug = Debug('ops:ConfigUtil')

export const writeConfig = async (
  oldConfigObj: Partial<Config> | null = {},
  newConfigObj: Partial<Config>,
  configDir: string,
): Promise<Partial<Config>> => {
  debug('writing new config')
  const mergedConfigObj = {
    ...oldConfigObj,
    ...newConfigObj,
  }
  await outputJson(path.join(configDir, 'config.json'), mergedConfigObj)
  return mergedConfigObj
}

export const readConfig = async (configDir: string): Promise<Config> => {
  debug('reading config')
  return readJson(path.join(configDir, 'config.json')).catch(err => {
    if (err.code === 'ENOENT') {
      debug(`No config file found at ${err.path}`)
    } else {
      debug('%O', err)
    }
    return {}
  })
}

export const clearConfig = async (configDir: string) => {
  debug('clearing config')
  const configPath = path.join(configDir, 'config.json')
  await remove(configPath)
}

const handleTeamNotFound = () => {
  debug('team not found')
  return {
    id: '',
    name: 'not found',
  }
}

const getTeam = (username: string, teams: Team[]) => {
  const team = teams.find(({ name }) => name === username)
  return team || handleTeamNotFound()
}

export const includeRegistryHost = (debug: boolean) =>
  debug ? { registryHost: OPS_REGISTRY_HOST, nodeEnv: NODE_ENV } : {}

export const formatConfigObject = (signinData: SigninPipeline) => {
  const {
    tokens: { accessToken, refreshToken, idToken, sessionState },
    meResponse: { teams, me },
  } = signinData

  const configObj: Config = {
    user: {
      ...me,
      ...includeRegistryHost(OPS_DEBUG),
    },
    team: getTeam(me.username, teams),
    tokens: {
      accessToken,
      refreshToken,
      idToken,
      sessionState,
    },
  }
  return configObj
}
