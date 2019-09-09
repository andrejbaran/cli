/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 30th April 2019 12:07:49 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 12th June 2019 9:57:48 am
 * @copyright (c) 2019 CTO.ai
 */

import cloneDeep from 'lodash/cloneDeep'
import Command, { flags } from '../../base'
import {
  Question,
  Config,
  Container,
  UserCredentials,
  Tokens,
} from '../../types'
import { asyncPipe } from '../../utils/asyncPipe'
import { AnalyticsError, SSOError } from '../../errors/CustomErrors'

export const signinPrompts: Container<Question> = {
  email: {
    type: 'input',
    name: 'email',
    message: 'Enter email: ',
  },
  password: {
    type: 'password',
    name: 'password',
    message: 'Enter password: ',
    mask: '*',
  },
}

export default class AccountSignin extends Command {
  static description = 'Logs in to your account.'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  logMessages = () => {
    this.log('')
    this.log(
      `💻 ${this.ux.colors.multiBlue(
        'CTO.ai Ops',
      )} - ${this.ux.colors.actionBlue('The CLI built for Teams')} 🚀`,
    )
    this.log('')
    this.log(
      `👋 ${this.ux.colors.white(
        'Welcome to the',
      )} ${this.ux.colors.callOutCyan('Ops CLI beta')}! \n`,
    )
  }

  keycloakSignInFlow = async (): Promise<Tokens> => {
    this.ux.spinner.start('Authenticating using Single Sign On')
    const tokens = await this.services.keycloakService
      .keycloakSignInFlow()
      .catch(() => {
        throw new SSOError()
      })
    this.ux.spinner.stop('Finished')
    return tokens
  }

  signin = async (tokens: Tokens) => {
    this.log('')
    this.ux.spinner.start(`${this.ux.colors.white('Authenticating')}`)
    return this.signinFlow(tokens)
  }

  showWelcomeMessage = (config: Config) => {
    this.ux.spinner.stop(`${this.ux.colors.green('Done!')}`)
    this.log(
      `\n👋 ${this.ux.colors.white('Welcome back')} ${this.ux.colors.italic.dim(
        config.user.username,
      )}!`,
    )
    this.log(
      `\n👉 Type ${this.ux.colors.italic.dim(
        'ops search',
      )} to find ops or ${this.ux.colors.italic.dim(
        'ops init',
      )} to create your own! \n`,
    )

    return cloneDeep(config)
  }

  sendAnalytics = (config: Config) => {
    try {
      this.services.analytics.identify({
        userId: config.user.email,
        traits: {
          beta: true,
          email: config.user.email,
          username: config.user.username,
        },
      })
      this.services.analytics.track(
        {
          userId: config.user.email,
          event: 'Ops CLI Signin',
          properties: {
            email: config.user.email,
            username: config.user.username,
          },
        },
        config.tokens.accessToken,
      )
    } catch (err) {
      this.debug('%O', err)
      throw new AnalyticsError(err)
    }
    return cloneDeep(config)
  }

  async run() {
    this.parse(AccountSignin)
    try {
      const signinPipeline = asyncPipe(
        this.logMessages,
        this.keycloakSignInFlow,
        this.signin,
        this.showWelcomeMessage,
        this.sendAnalytics,
      )

      await signinPipeline()
    } catch (err) {
      this.ux.spinner.stop('Failed')
      this.debug('%O', err)
      this.config.runHook('error', { err })
    }
  }
}
