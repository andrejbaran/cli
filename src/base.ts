/**
 * @author: Brett Campbell (brett@hackcapital.com)
 * @date: Friday, 5th April 2019 12:06:07 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Tuesday, 14th May 2019 11:26:16 am
 * @copyright (c) 2019 CTO.ai
 *
 */

import { ux as _ux } from '@cto.ai/sdk'
import Command, { flags } from '@oclif/command'
import * as OClifConfig from '@oclif/config'
import Analytics from 'analytics-node'
import Docker from 'dockerode'
import { outputJson, readJson, remove } from 'fs-extra'
import * as path from 'path'
import getDocker from './utils/get-docker'
import { asyncPipe, _trace } from './utils/asyncPipe'
import { handleMandatory, handleUndefined } from './utils/guards'

import {
  Config,
  User,
  Team,
  UserCredentials,
  ValidationFields,
  AccessToken,
  MeResponse,
  RegistryAuth,
  SigninPipeline,
  RegistryResponse,
  ApiService,
} from './types'

import {
  NODE_ENV,
  OPS_REGISTRY_HOST,
  OPS_SEGMENT_KEY,
  INTERCOM_EMAIL,
  DEBUG,
} from './constants/env'

import { FeathersClient } from './services/feathers'
import { UserUnauthorized, APIError } from './errors/customErrors'

abstract class CTOCommand extends Command {
  analytics = new Analytics(OPS_SEGMENT_KEY)
  docker!: Docker | undefined

  accessToken!: string
  user!: User
  team!: Team
  state!: { config: Config }

  ux = _ux

  constructor(
    argv: string[],
    config: OClifConfig.IConfig,
    protected api: ApiService = new FeathersClient(),
  ) {
    super(argv, config)
  }

  async init() {
    try {
      const config = await this.readConfig()

      const { user, accessToken, team } = config
      this.accessToken = accessToken
      this.user = user
      this.team = team
      this.state = { config }
      this.docker = await this._getDocker()
    } catch (err) {
      this.config.runHook('error', { err })
    }
  }

  getRegistryAuth = async (
    accessToken: string,
  ): Promise<RegistryAuth | undefined> => {
    try {
      const registryResponse: RegistryResponse = await this.api.find(
        'registry/token',
        {
          query: {
            registryProject: this.team.name,
          },
          headers: { Authorization: accessToken },
        },
      )
      if (
        !registryResponse.data ||
        !registryResponse.data.registry_tokens.length
      ) {
        throw new UserUnauthorized(this.state)
      }

      const {
        registryProject = '',
        registryUser = '',
        registryPass = '',
      } = registryResponse.data.registry_tokens[0]

      const projectFullName = `${OPS_REGISTRY_HOST}/${registryProject}`
      const projectUrl = `https://${projectFullName}`

      const registryAuth: RegistryAuth = {
        authconfig: {
          username: registryUser,
          password: registryPass,
          serveraddress: projectUrl,
        },
        projectFullName,
      }

      return registryAuth
    } catch (err) {
      this.config.runHook('error', { err })
    }
  }

  isLoggedIn() {
    if (!this.user) {
      this.log('')
      this.log('✋ Sorry you need to be logged in to do that.')
      this.log(
        `🎳 You can sign up with ${this.ux.colors.green(
          '$',
        )} ${this.ux.colors.callOutCyan('ops account:signup')}`,
      )
      this.log('')
      this.log('❔ Please reach out to us with questions anytime!')
      this.log(
        `⌚️ We are typically available ${this.ux.colors.white(
          'Monday-Friday 9am-5pm PT',
        )}.`,
      )
      this.log(
        `📬 You can always reach us by ${this.ux.url(
          'email',
          `mailto:${INTERCOM_EMAIL}`,
        )} ${this.ux.colors.dim(`(${INTERCOM_EMAIL})`)}.\n`,
      )
      this.log("🖖 We'll get back to you as soon as we possibly can.")
      this.log('')

      process.exit()
    }
  }

  readConfig = async (): Promise<Config> => {
    return readJson(path.join(this.config.configDir, 'config.json')).catch(
      () => {
        return {}
      },
    )
  }

  handleTeamNotFound = () => {
    this.error('team not found')
    return {
      id: '',
      name: 'not found',
    }
  }

  getTeam = (username: string, teams: Team[]) => {
    const team = teams.find(({ name }) => name === username)
    return team || this.handleTeamNotFound()
  }

  _includeRegistryHost = (debug: number | boolean | string) =>
    debug ? { registryHost: OPS_REGISTRY_HOST, nodeEnv: NODE_ENV } : {}

  formatConfigObject = (signinData: SigninPipeline) => {
    const {
      accessToken,
      meResponse: {
        teams,
        me: { id, emails, username },
      },
    } = signinData

    const configObj: Config = {
      team: this.getTeam(username, teams),
      accessToken,
      user: {
        _id: id,
        email: emails[0].address,
        username: username,
        ...this._includeRegistryHost(DEBUG),
      },
    }
    return configObj
  }

  writeConfig = async (
    oldConfigObj: Partial<Config> | null = {},
    newConfigObj: Partial<Config>,
  ): Promise<Partial<Config>> => {
    const mergedConfigObj = {
      ...oldConfigObj,
      ...newConfigObj,
    }
    await outputJson(
      path.join(this.config.configDir, 'config.json'),
      mergedConfigObj,
    )
    return mergedConfigObj
  }

  clearConfig = async (args: unknown) => {
    const configPath = path.join(this.config.configDir, 'config.json')
    await remove(configPath)
    return args
  }

  authenticateUser = async ({
    credentials = handleMandatory('credentials'),
  }: Partial<SigninPipeline>) => {
    if (!credentials || !credentials.password || !credentials.email) {
      throw 'invalid user credentials'
    }

    const res: AccessToken = await this.api
      .create('login', {
        email: credentials.email,
        password: credentials.password,
      })
      .catch(err => {
        throw new APIError(err)
      })
    const { data: accessToken = handleUndefined('accessToken') } = res
    return { accessToken, credentials }
  }

  fetchUserInfo = async (args: SigninPipeline) => {
    if (!args) {
      this.ux.spinner.stop(`failed`)
      this.log('missing parameter')
      process.exit()
    }

    const { accessToken } = args
    if (!accessToken) {
      this.ux.spinner.stop(`❗️\n`)
      this.log(
        `🤔 Sorry, we couldn’t find an account with that email or password.\nForgot your password? Run ${this.ux.colors.bold(
          'ops account:reset',
        )}.\n`,
      )
      process.exit()
    }
    const {
      data: meResponse,
    }: {
      data: MeResponse
    } = await this.api
      .find('me', {
        headers: { Authorization: accessToken },
      })
      .catch(err => {
        throw new APIError(err)
      })
    return { meResponse, accessToken }
  }

  async signinFlow(credentials: UserCredentials) {
    //to-do: check if credentials are set first
    const signinFlowPipeline = asyncPipe(
      this.authenticateUser,
      this.fetchUserInfo,
      this.clearConfig,
      this.formatConfigObject,
      this.writeConfig,
      this.readConfig,
    )

    const config: Config = await signinFlowPipeline({ credentials })
    return config
  }

  async validateUniqueField(query: ValidationFields): Promise<boolean> {
    const response = await this.api
      .find('validate', {
        query,
      })
      .catch(err => {
        throw new APIError(err)
      })
    return response.data
  }

  private async _getDocker() {
    if (NODE_ENV === 'test') return
    return getDocker(this, 'base')
  }

  async createToken(email: string) {
    return this.api.create('reset', { email })
  }

  async resetPassword(token: string, password: string) {
    return this.api.patch('reset', token, { password })
  }
}

export { CTOCommand as default, flags }
