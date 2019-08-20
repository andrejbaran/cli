/**
 * @author: Brett Campbell (brett@hackcapital.com)
 * @date: Friday, 5th April 2019 12:06:07 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Tuesday, 11th June 2019 1:50:03 pm
 * @copyright (c) 2019 CTO.ai
 *
 */

import { ux as UX } from '@cto.ai/sdk'
import Command, { flags } from '@oclif/command'
import Debug from 'debug'
import * as OClifConfig from '@oclif/config'
import _inquirer from '@cto.ai/inquirer'
import { outputJson, readJson, remove } from 'fs-extra'
import * as path from 'path'
import jwt from 'jsonwebtoken'

import { asyncPipe, _trace } from './utils'

import {
  Config,
  User,
  Team,
  ValidationFields,
  MeResponse,
  RegistryAuth,
  SigninPipeline,
  RegistryResponse,
  Tokens,
  Services,
} from './types'

import {
  NODE_ENV,
  OPS_REGISTRY_HOST,
  OPS_SEGMENT_KEY,
  INTERCOM_EMAIL,
  OPS_DEBUG,
} from './constants/env'

import { FeathersClient } from './services/Feathers'
import { AnalyticsService } from './services/Analytics'
import {
  UserUnauthorized,
  APIError,
  TokenExpiredError,
} from './errors/CustomErrors'

import { Publish } from './services/Publish'
import { BuildSteps } from './services/BuildSteps'
import { ImageService } from './services/Image'

import { WorkflowService } from './services/Workflow'
import { OpService } from './services/Op'
import { KeycloakService } from './services/Keycloak'

const debug = Debug('ops:BaseCommand')

abstract class CTOCommand extends Command {
  accessToken!: string
  user!: User
  team!: Team
  state!: { config: Config }

  ux = UX

  services: Services

  constructor(
    argv: string[],
    config: OClifConfig.IConfig,
    services: Services = {
      api: new FeathersClient(),
      publishService: new Publish(),
      buildStepService: new BuildSteps(),
      imageService: new ImageService(),
      analytics: new AnalyticsService(OPS_SEGMENT_KEY),
      workflowService: new WorkflowService(),
      opService: new OpService(),
      keycloakService: new KeycloakService(),
    },
  ) {
    super(argv, config)
    this.services = services
    this.services.api = services.api || new FeathersClient()
    this.services.publishService = services.publishService || new Publish()
    this.services.buildStepService =
      services.buildStepService || new BuildSteps()
    this.services.imageService = services.imageService || new ImageService()
    this.services.analytics =
      services.analytics || new AnalyticsService(OPS_SEGMENT_KEY)
    this.services.workflowService =
      services.workflowService || new WorkflowService()
    this.services.opService = services.opService || new OpService()
    this.services.keycloakService =
      services.keycloakService || new KeycloakService()
  }

  async init() {
    try {
      await this.services.keycloakService.init()
      const config = await this.readConfig()

      const { user, tokens, team } = config
      if (tokens) {
        this.accessToken = tokens.accessToken
      }
      this.user = user
      this.team = team
      this.state = { config }
    } catch (err) {
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }

  checkValidAccessToken = async (tokens: Tokens): Promise<void> => {
    try {
      if (!tokens) return
      const { accessToken, refreshToken, idToken } = tokens
      if (!accessToken || !refreshToken || !idToken) return

      const { exp: refreshTokenExp } = jwt.decode(refreshToken)
      const clockTimestamp = Math.floor(Date.now() / 1000)

      if (clockTimestamp >= refreshTokenExp) {
        throw new TokenExpiredError()
      }

      /**
       * The following code updates the access token every time
       */
      const oldConfig = await this.readConfig()
      const newTokens = await this.services.keycloakService.refreshAccessToken(
        oldConfig,
        refreshToken,
      )
      this.accessToken = newTokens.accessToken
      await this.writeConfig(oldConfig, { tokens: newTokens })
    } catch (error) {
      await this.clearConfig(tokens)
      throw new TokenExpiredError()
    }
  }

  getRegistryAuth = async (
    accessToken: string,
    teamName: string,
  ): Promise<RegistryAuth | undefined> => {
    try {
      const registryResponse: RegistryResponse = await this.services.api.find(
        'registry/token',
        {
          query: {
            registryProject: teamName,
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
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }

  async isLoggedIn() {
    const { tokens } = await this.readConfig()
    if (tokens) {
      await this.checkValidAccessToken(tokens)
    }
    if (!this.user || !this.team || !this.accessToken) {
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

  _includeRegistryHost = (debug: boolean) =>
    debug ? { registryHost: OPS_REGISTRY_HOST, nodeEnv: NODE_ENV } : {}

  fetchUserInfo = async ({ tokens }: SigninPipeline) => {
    if (!{ tokens }) {
      this.ux.spinner.stop(`failed`)
      this.log('missing parameter')
      process.exit()
    }

    const { accessToken, idToken } = tokens
    if (!accessToken || !idToken) {
      this.ux.spinner.stop(`❗️\n`)
      this.log(
        `🤔 Sorry, we couldn’t find an account with that email or password.\nForgot your password? Run ${this.ux.colors.bold(
          'ops account:reset',
        )}.\n`,
      )
      process.exit()
    }

    const { sub, preferred_username, email } = jwt.decode(idToken)

    const me = {
      id: sub,
      username: preferred_username,
      email,
    }

    const { data: teams }: { data: Team[] } = await this.services.api
      .find('teams', {
        query: {
          userId: sub,
        },
        headers: { Authorization: accessToken },
      })
      .catch(err => {
        debug('%O', err)
        throw new APIError(err)
      })
    const meResponse = {
      me,
      teams,
    }
    return { meResponse, tokens }
  }

  clearConfig = async (argv: unknown) => {
    const configPath = path.join(this.config.configDir, 'config.json')
    await remove(configPath)
    return argv
  }

  formatConfigObject = (signinData: SigninPipeline) => {
    const {
      tokens: { accessToken, refreshToken, idToken, sessionState },
      meResponse: { teams, me },
    } = signinData

    const configObj: Config = {
      user: {
        ...me,
        ...this._includeRegistryHost(OPS_DEBUG),
      },
      team: this.getTeam(me.username, teams),
      tokens: {
        accessToken,
        refreshToken,
        idToken,
        sessionState,
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

  readConfig = async (): Promise<Config> => {
    return readJson(path.join(this.config.configDir, 'config.json')).catch(
      () => {
        return {}
      },
    )
  }

  invalidateKeycloakSession = async () => {
    // Obtains the session state if exists
    const sessionState = this.state.config
      ? this.state.config.tokens
        ? this.state.config.tokens.sessionState
        : null
      : null

    // If session state exists, invalidate it
    if (sessionState) await this.services.api.remove('sessions', sessionState)
  }

  async signinFlow(tokens: Tokens) {
    //to-do: check if credentials are set first
    const signinFlowPipeline = asyncPipe(
      this.fetchUserInfo,
      this.clearConfig,
      this.formatConfigObject,
      this.writeConfig,
      this.readConfig,
    )

    const config: Config = await signinFlowPipeline({ tokens, meResponse: {} })
    return config
  }

  async validateUniqueField(query: ValidationFields): Promise<boolean> {
    const response = await this.services.api
      .find('validate', {
        query,
      })
      .catch(err => {
        throw new APIError(err)
      })
    return response.data
  }
}

export { CTOCommand as default, flags }
