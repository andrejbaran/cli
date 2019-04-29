import ErrorTemplate from '@hackcapital/errors'
import Command, { flags } from '../../base'
import { ux } from '@cto.ai/sdk'
import UserCredentials from '../../types/UserCredentials'
import { Question } from 'inquirer'
import Container from '../../types/Container'

import cloneDeep from 'lodash/cloneDeep'

import { asyncPipe, _trace } from '../../utils/asyncPipe'
import Config from '../../types/Config'

const signinPrompts: Container<Question> = {
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

class UserNotFound extends ErrorTemplate {
  /**
   * @constructor
   */
  constructor(user, note) {
    super('User not found!', {
      extra: user,
      errorCode: 'US0001',
      statusCode: 404,
      note: note,
    })
  }
}
export default class AccountSignin extends Command {
  static description = 'Logs in to your account'

  static flags = {
    help: flags.help({ char: 'h' }),
    email: flags.string({ char: 'e' }),
    password: flags.string({ char: 'p' }),
  }

  sendAnalytics = (ctx: AccountSignin) => (config: Config) => {
    // This is wrapped in an if statement because it takes a while to finish executing.
    // The `nock` code that is supposed to intercept this call and counter it is not equipped
    // to handle this
    if (process.env.NODE_ENV !== 'test') {
      ctx.analytics.identify({
        userId: config.user.email,
        traits: {
          beta: true,
          email: config.user.email,
          username: config.user.username,
        },
      })
    }
    ctx.analytics.track({
      userId: config.user.email,
      event: 'Ops CLI Signin',
      properties: {
        email: config.user.email,
        username: config.user.username,
      },
    })
    return cloneDeep(config)
  }

  showWelcomeMessage = (ctx: AccountSignin) => (config: Config) => {
    ux.spinner.stop(`${ux.colors.green('Done!')}`)
    ctx.log(
      `\n👋 ${ux.colors.white('Welcome back')} ${ux.colors.italic.dim(
        config.user.username,
      )}!`,
    )
    ctx.log(
      `\n👉 Type ${ux.colors.italic.dim(
        'ops search',
      )} to find ops or ${ux.colors.italic.dim(
        'ops init',
      )} to create your own! \n`,
    )

    return cloneDeep(config)
  }

  signin = (ctx: AccountSignin) => async (credentials: UserCredentials) => {
    ctx.log('')
    ux.spinner.start(`${ux.colors.white('Authenticating')}`)
    return await ctx.signinFlow(credentials)
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

  askQuestions = (ctx: AccountSignin) => async (questions: Question[]) => {
    if (!questions.length) {
      return await {}
    }
    ctx.log(`${ux.colors.white('Please login to get started.')}\n`)
    return (await ux.prompt(questions)) as UserCredentials
  }

  determineUserCredentials = (flags: UserCredentials) => (
    answers: UserCredentials,
  ): UserCredentials => ({ ...flags, ...answers })

  logMessages = (ctx: AccountSignin) => (input: UserCredentials) => {
    ctx.log('')
    ctx.log(
      `💻 ${ux.colors.multiBlue('CTO.ai Ops')} - ${ux.colors.actionBlue(
        'The CLI built for Teams',
      )} 🚀`,
    )
    ctx.log('')
    ctx.log(
      `👋 ${ux.colors.white('Welcome to the')} ${ux.colors.callOutCyan(
        'Ops CLI beta',
      )}! \n`,
    )
    return { ...input }
  }

  async run() {
    const { flags } = this.parse(AccountSignin)

    const signinPipeline = asyncPipe(
      this.logMessages(this),
      this.determineQuestions(signinPrompts),
      this.askQuestions(this),
      this.determineUserCredentials(flags),
      this.signin(this),
      this.showWelcomeMessage(this),
      this.sendAnalytics(this),
    )

    await signinPipeline(flags)
  }
}
