import { ux as UX } from '@cto.ai/sdk'
import Command, { flags } from '@oclif/command'
import Debug from 'debug'
import * as OClifConfig from '@oclif/config'
import _inquirer from '@cto.ai/inquirer'
import jwt from 'jsonwebtoken'
import axios from 'axios'
import { defaultServicesList } from '~/services'
import {
  asyncPipe,
  _trace,
  writeConfig,
  readConfig,
  clearConfig,
  formatConfigObject,
} from './utils'

import {
  Config,
  User,
  Team,
  ValidationFields,
  SigninPipeline,
  Tokens,
  Services,
} from './types'

import { INTERCOM_EMAIL } from './constants/env'

import { APIError, TokenExpiredError } from './errors/CustomErrors'

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
    services: Services = defaultServicesList,
  ) {
    super(argv, config)
    this.services = Object.assign(defaultServicesList, services)
  }

  async init() {
    try {
      debug('initiating base command')
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

  isTokenValid = (tokens: Tokens): boolean => {
    const { refreshToken } = tokens
    const { exp: refreshTokenExp } = jwt.decode(refreshToken)
    const clockTimestamp = Math.floor(Date.now() / 1000)

    /*
     * Note: when the token is an offline token, refreshTokenExp will be equal to 0. We are not issuing offline tokens at the moment, but if we do, we need to add the extra condition that refreshTokenExp !== 0
     */
    return clockTimestamp < refreshTokenExp
  }

  checkAndRefreshAccessToken = async (tokens: Tokens): Promise<Config> => {
    debug('checking for valid access token')
    try {
      const { refreshToken } = tokens
      if (!this.isTokenValid(tokens)) throw new TokenExpiredError()

      /**
       * The following code updates the access token every time a command is run
       */
      const oldConfig = await this.readConfig()
      const newTokens = await this.services.keycloakService.refreshAccessToken(
        oldConfig,
        refreshToken,
      )
      this.accessToken = newTokens.accessToken
      await this.writeConfig(oldConfig, { tokens: newTokens })

      const config: Config = await this.readConfig()
      this.state.config = config
      return config
    } catch (error) {
      debug('%O', error)
      await this.clearConfig()
      throw new TokenExpiredError()
    }
  }

  async isLoggedIn(): Promise<Config> {
    debug('checking if user is logged in')
    const config = await this.readConfig()
    const { tokens } = config

    if (
      !this.user ||
      !this.team ||
      !this.accessToken ||
      !tokens ||
      !tokens.accessToken ||
      !tokens.refreshToken ||
      !tokens.idToken
    ) {
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

    return this.checkAndRefreshAccessToken(tokens)
  }

  fetchUserInfo = async ({ tokens }: SigninPipeline) => {
    if (!tokens) {
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
      .find('/private/teams', {
        query: {
          userId: sub,
        },
        headers: { Authorization: accessToken },
      })
      .catch(err => {
        debug('%O', err)
        throw new APIError(err)
      })

    if (!teams) {
      throw new APIError(
        'According to the API, this user does not belong to any teams.',
      )
    }

    const meResponse = {
      me,
      teams,
    }
    return { meResponse, tokens }
  }

  writeConfig = async (
    oldConfigObj: Partial<Config> | null = {},
    newConfigObj: Partial<Config>,
  ): Promise<Partial<Config>> => {
    return writeConfig(oldConfigObj, newConfigObj, this.config.configDir)
  }

  readConfig = async (): Promise<Config> => {
    return readConfig(this.config.configDir)
  }

  clearConfig = async () => {
    return clearConfig(this.config.configDir)
  }

  invalidateKeycloakSession = async () => {
    // Obtains the session state if exists
    const sessionState = this.state.config
      ? this.state.config.tokens
        ? this.state.config.tokens.sessionState
        : null
      : null

    // If session state exists, invalidate it
    if (sessionState)
      await axios.get(
        this.services.keycloakService.buildInvalidateSessionUrl(),
        {
          headers: this.services.keycloakService.buildInvalidateSessionHeaders(
            sessionState,
            this.accessToken,
          ),
        },
      )
  }

  initConfig = async (tokens: Tokens) => {
    await this.clearConfig()

    const signinFlowPipeline = asyncPipe(
      this.fetchUserInfo,
      formatConfigObject,
      this.writeConfig,
      this.readConfig,
    )

    const config: Config = await signinFlowPipeline({ tokens })
    return config
  }

  async validateUniqueField(
    query: ValidationFields,
    accessToken: string,
  ): Promise<boolean> {
    const response = await this.services.api
      .find('/private/validate', {
        query,
        headers: { Authorization: accessToken },
      })
      .catch(err => {
        throw new APIError(err)
      })
    return response.data
  }
}

export { CTOCommand as default, flags }
