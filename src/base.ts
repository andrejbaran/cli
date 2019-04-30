import { ux } from '@cto.ai/sdk'
import feathers from '@feathersjs/feathers'
import rest from '@feathersjs/rest-client'
import Command, { flags } from '@oclif/command'
import Analytics from 'analytics-node'
import axios from 'axios'
import Docker from 'dockerode'
import { outputJson, readJson, remove } from 'fs-extra'
import * as path from 'path'
import * as url from 'url'

import getDocker from './utils/get-docker'
import { asyncPipe, _trace } from './utils/asyncPipe'

import Config from './types/Config'
import User from './types/User'
import UserCredentials from './types/UserCredentials'
import ValidationFields from './types/ValidationFields'
import AccessToken from './types/AccessToken'
import MeResponse from './types/MeResponse'
import Team from './types/Team'
import RegistryAuth from './types/RegistryAuth'
import SigninPipeline from './types/SigninPipeline'
import Partial from './types/Partial'

process.env.NODE_ENV = process.env.NODE_ENV || 'production'
const ops_segment_key =
  process.env.OPS_SEGMENT_KEY || 'sRsuG18Rh9IHgr9bK7GsrB7BfLfNmhCG'
const ops_host = process.env.OPS_API_HOST || 'https://cto.ai/'
const ops_path = process.env.OPS_API_PATH || 'api/v1'

export const apiUrl = url.resolve(ops_host, ops_path)

abstract class CTOCommand extends Command {
  client = feathers().configure(rest(apiUrl).axios(axios))
  analytics = new Analytics(ops_segment_key)
  accessToken: string = ''
  user: User
  team: Team
  docker: Docker | undefined
  ops_registry_host: string = process.env.OPS_REGISTRY_HOST || 'registry.cto.ai'
  ops_registry_auth: RegistryAuth

  getOpsRegistryAuth = async (accessToken: string): Promise<RegistryAuth> => {
    const registryResponse = await this.client.service('registry/token').find({
      query: {
        registryProject: this.team.name,
      },
      headers: { Authorization: accessToken },
    })

    const {
      registryProject = '',
      registryUser = '',
      registryPass = '',
    } = registryResponse.data.registry_tokens[0]

    const registryAuth: RegistryAuth = {
      username: registryUser,
      password: registryPass,
      serveraddress: `${this.ops_registry_host}/${registryProject}`,
    }

    return registryAuth
  }

  async init() {
    const { user, accessToken, team } = await this.readConfig()
    if (user) {
      this.user = user
    }
    if (accessToken) {
      this.accessToken = accessToken
    }
    this.team = team
    this.docker = await this._getDocker()
  }

  isLoggedIn() {
    if (!this.user) {
      this.log('')
      this.log('✋ Sorry you need to be logged in to do that.')
      this.log(
        `🎳 You can sign up with ${ux.colors.green(
          '$',
        )} ${ux.colors.callOutCyan('ops account:signup')}`,
      )
      this.log('')
      this.log('❔ Please reach out to us with questions anytime!')
      this.log(
        `⌚️ We are typically available ${ux.colors.white(
          'Monday-Friday 9am-5pm PT',
        )}.`,
      )
      this.log(
        `📬 You can always reach us by ${ux.url(
          'email',
          'mailto:h1gw0mit@ctoai.intercom-mail.com',
        )} ${ux.colors.dim('(h1gw0mit@ctoai.intercom-mail.com)')}.\n`,
      )
      this.log("🖖 We'll get back to you as soon as we possibly can.")
      this.log('')

      process.exit()
    }
  }

  readConfig = async (): Promise<Config> =>
    readJson(path.join(this.config.configDir, 'config.json')).catch(() => ({}))

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
      },
    }
    return configObj
  }

  writeConfig = async (newConfigObj: Partial<Config>): Promise<Config> => {
    const oldConfigObj = await this.readConfig()
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

  authenticateUser = async ({ credentials }: SigninPipeline) => {
    const { data: accessToken } = (await this.client
      .service('login')
      .create(credentials)) as AccessToken

    return { accessToken, credentials }
  }

  fetchUserInfo = async (args: SigninPipeline) => {
    if (!args) {
      ux.spinner.stop(`failed`)
      this.log('missing parameter')
      process.exit()
    }

    const { accessToken } = args
    if (!accessToken) {
      ux.spinner.stop(`❗️\n`)
      this.log(
        `🤔 Sorry, we couldn’t find an account with that email or password.\nForgot your password? Run ${ux.colors.bold(
          'ops account:reset',
        )}.\n`,
      )
      process.exit()
    }

    try {
      const { data: meResponse } = (await this.client
        .service('me')
        .find({ headers: { Authorization: accessToken } })) as {
        data: MeResponse
      }
      return { meResponse, accessToken }
    } catch (error) {
      throw new Error(error)
    }
  }

  async signinFlow(credentials: UserCredentials) {
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
    const response = await this.client.service('validate').find({
      query,
    })
    return response.data
  }

  private async _getDocker() {
    if (process.env.NODE_ENV === 'test') return
    const self = this
    return getDocker(self, 'base')
  }

  async createToken(email: string) {
    return this.client.service('reset').create({ email })
  }

  async resetPassword(token: string, password: string) {
    return this.client.service('reset').patch(token, { password })
  }

  async joinTeam(inviteCode: string) {
    return this.client
      .service('teams/accept')
      .create({ inviteCode }, { headers: { Authorization: this.accessToken } })
  }
}

export { CTOCommand as default, flags }
