/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 30th April 2019 12:07:49 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Friday, 20th September 2019 1:48:16 pm
 * @copyright (c) 2019 CTO.ai
 */

import cloneDeep from 'lodash/cloneDeep'
import Command, { flags } from '../../base'
import {
  Question,
  Config,
  Container,
  Tokens,
  UserCredentials,
} from '../../types'
import { asyncPipe } from '../../utils/asyncPipe'
import { AnalyticsError, SSOError } from '../../errors/CustomErrors'

export const signinPrompts: Container<Question> = {
  user: {
    type: 'input',
    name: 'user',
    message: 'Username or email: ',
  },
  password: {
    type: 'password',
    name: 'password',
    message: 'Password: ',
    mask: '*',
  },
}

export default class AccountSignin extends Command {
  static description = 'Log in to your account.'

  static flags = {
    help: flags.help({ char: 'h' }),
    interactive: flags.boolean({
      char: 'i',
      description: 'Interactive Mode',
      hidden: true,
    }),
    user: flags.string({
      char: 'u',
      description: 'Username or email',
      hidden: true,
    }),
    password: flags.string({
      char: 'p',
      description: 'Password',
      hidden: true,
    }),
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

  createConfigFile = async (tokens: Tokens) => {
    this.log('')
    this.ux.spinner.start(`${this.ux.colors.white('Authenticating')}`)
    return this.initConfig(tokens)
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
      this.services.analytics.track(
        {
          userId: config.user.email,
          teamId: config.team.id,
          cliEvent: 'Ops CLI Signin',
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

  determineQuestions = (
    prompts: Container<Question>,
    flags: Partial<UserCredentials>,
  ) => () => {
    const removeIfPassedToFlags = ([key, _question]: [string, Question]) =>
      !Object.entries(flags)
        .map(([flagKey]) => flagKey)
        .includes(key)

    const questions = Object.entries(prompts)
      .filter(removeIfPassedToFlags)
      .map(([_key, question]) => question)

    return questions
  }

  getRefreshToken = async (
    credentials: Pick<UserCredentials, 'user' | 'password'>,
  ) => {
    const tokens = await this.services.keycloakService.getTokenFromPasswordGrant(
      credentials,
    )
    return tokens
  }

  askQuestions = async (
    questions: Question[],
  ): Promise<UserCredentials | {}> => {
    if (!questions.length) {
      return {}
    }
    this.log(`${this.ux.colors.white('Please login to get started.')}\n`)
    return this.ux.prompt<Partial<UserCredentials>>(questions)
  }

  determineUserCredentials = (flags: Partial<UserCredentials>) => (
    answers: Partial<UserCredentials>,
  ): Partial<UserCredentials> => ({ ...flags, ...answers })

  browserSigninPipeline = asyncPipe(
    this.logMessages,
    this.keycloakSignInFlow,
    this.createConfigFile,
    this.showWelcomeMessage,
    this.sendAnalytics,
  )

  cliSigninPipeline = (flags: Partial<UserCredentials>) =>
    asyncPipe(
      this.logMessages,
      this.determineQuestions(signinPrompts, flags),
      this.askQuestions,
      this.determineUserCredentials(flags),
      this.getRefreshToken,
      this.createConfigFile,
      this.showWelcomeMessage,
      this.sendAnalytics,
    )

  async run() {
    try {
      const { flags } = this.parse(AccountSignin)
      await this.services.keycloakService.init()

      /*
       * If -u, -p, or -i flags are passed, sign-in via the CLI as opposed to
       * the browser.
       *
       * If -i AND either -u or -p are passed, it doesn't matter because the CLI
       * will prompt for all missing flags.
       */
      if (flags.interactive || flags.user || flags.password) {
        return await this.cliSigninPipeline(flags)()
      }

      return await this.browserSigninPipeline()
    } catch (err) {
      this.ux.spinner.stop('Failed')
      this.debug('%O', err)
      this.config.runHook('error', { err })
    }
  }
}
