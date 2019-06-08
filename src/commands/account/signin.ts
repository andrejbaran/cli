/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 30th April 2019 12:07:49 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Thursday, 6th June 2019 3:19:14 pm
 * @copyright (c) 2019 CTO.ai
 */

import cloneDeep from 'lodash/cloneDeep'
import Command, { flags } from '../../base'
import { Question, Config, Container, UserCredentials } from '../../types'
import { asyncPipe } from '../../utils/asyncPipe'
import { AnalyticsError } from '../../errors/customErrors'

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
    email: flags.string({ char: 'e', description: 'Email' }),
    password: flags.string({ char: 'p', description: 'Password' }),
  }

  sendAnalytics = (config: Config) => {
    try {
      this.analytics.identify({
        userId: config.user.email,
        traits: {
          beta: true,
          email: config.user.email,
          username: config.user.username,
        },
      })
      this.analytics.track({
        userId: config.user.email,
        event: 'Ops CLI Signin',
        properties: {
          email: config.user.email,
          username: config.user.username,
        },
      })
    } catch (err) {
      this.debug(err)
      throw new AnalyticsError(err)
    }
    return cloneDeep(config)
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

  signin = async (credentials: UserCredentials) => {
    this.log('')
    this.ux.spinner.start(`${this.ux.colors.white('Authenticating')}`)
    return this.signinFlow(credentials)
  }

  determineQuestions = (prompts: Container<Question>) => (
    flags: UserCredentials,
  ) => {
    const removeIfPassedToFlags = ([key, _question]: [string, Question]) =>
      !Object.entries(flags)
        .map(([flagKey]) => flagKey)
        .includes(key)

    const questions = Object.entries(prompts)
      .filter(removeIfPassedToFlags)
      .map(([_key, question]) => question)

    return questions
  }

  askQuestions = async (
    questions: Question[],
  ): Promise<UserCredentials | {}> => {
    if (!questions.length) {
      return {}
    }
    this.log(`${this.ux.colors.white('Please login to get started.')}\n`)
    return this.ux.prompt(questions)
  }

  determineUserCredentials = (flags: Partial<UserCredentials>) => (
    answers: Partial<UserCredentials>,
  ): Partial<UserCredentials> => ({ ...flags, ...answers })

  logMessages = (input: UserCredentials) => {
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
    return { ...input }
  }

  async run() {
    try {
      const { flags } = this.parse(AccountSignin)

      const signinPipeline = asyncPipe(
        this.logMessages,
        this.determineQuestions(signinPrompts),
        this.askQuestions,
        this.determineUserCredentials(flags),
        this.signin,
        this.showWelcomeMessage,
        this.sendAnalytics,
      )

      await signinPipeline(flags)
    } catch (err) {
      this.debug(err)
      this.config.runHook('error', { err })
    }
  }
}
