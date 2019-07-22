import { Question, Config, UserCredentials } from '~/types'
import Command, { flags } from '~/base'
import { INTERCOM_EMAIL, NODE_ENV } from '~/constants/env'
import { APIError, SignUpError, AnalyticsError } from '~/errors/CustomErrors'
import {
  validChars,
  validateEmail,
  validatePasswordFormat,
  validateCpassword,
} from '../../utils/validate'
import { asyncPipe } from '../../utils/asyncPipe'

interface SignUpData {
  email: string | undefined
  password: string | undefined
  username: string | undefined
}
export default class AccountSignup extends Command {
  static description = 'Creates an account to use with ops CLI.'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  _validateEmail = async (input: string) => {
    if (!validateEmail(input))
      return '❗ The format of your email is invalid, please check that it is correct and try again.'
    const unique = await this.validateUniqueField({ email: input }).catch(
      err => {
        this.debug('%O', err)
        throw new APIError(err)
      },
    )
    if (!unique)
      return '❗ Email is already used with another account, please try again using another.'
    return true
  }

  _validateUsername = async input => {
    try {
      if (!validChars.test(input)) {
        return `❗Sorry, your username must use letters (case sensitive), numbers (0-9), dashes (-) and underscores (_).`
      }
      const unique = await this.validateUniqueField({ username: input })
      if (!unique)
        return '😞 Username is already taken, please try using another.'
      return true
    } catch (err) {
      this.debug('%O', err)
      throw new APIError(err)
    }
  }

  questions: Question[] = [
    {
      type: 'input',
      name: 'email',
      message: `\n📩 Please enter your email ${this.ux.colors.reset.green(
        '→',
      )}  \n${this.ux.colors.white('Enter Email')}`,
      afterMessage: `${this.ux.colors.reset.green('✓')} Email`,
      afterMessageAppend: `${this.ux.colors.reset(' added!')}`,
      validate: this._validateEmail.bind(this),
    },
    {
      type: 'input',
      name: 'username',
      message: `\n🖖 Create a username to get started ${this.ux.colors.reset.green(
        '→',
      )}  \n${this.ux.colors.white('Enter Username')}`,
      afterMessage: `${this.ux.colors.reset.green('✓')} Username`,
      afterMessageAppend: `${this.ux.colors.reset(' created!')}`,
      validate: this._validateUsername.bind(this),
    },
    {
      type: 'password',
      name: 'password',
      mask: '*',
      message: `\n🔑 Let's create a password next ${this.ux.colors.reset.green(
        '→',
      )}  \n${this.ux.colors.white('Enter your password')}`,
      afterMessage: `${this.ux.colors.reset.green('✓')} Password added!`,
      validate: validatePasswordFormat,
    },
    {
      type: 'password',
      name: 'cpassword',
      mask: '*',
      message: '\n🔑 Confirm your password: ',
      afterMessage: `${this.ux.colors.reset.green('✓')} Password confirmed!`,
      validate: validateCpassword,
    },
  ]

  logConfirmationMessage = () => {
    this.ux.spinner.stop(`${this.ux.colors.green('Done!')}`)

    this.log(
      `\n✅  ${this.ux.colors.white(
        'Your account is setup! You can now build, run and share ops!',
      )}`,
    )
    this.log(
      `🎉  ${this.ux.colors.white(
        'We just sent you an email with tips on how to get started!',
      )}\n`,
    )
  }

  trackSignup = (config: Config) => {
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
        event: 'Ops CLI Signup',
        properties: {
          email: config.user.email,
          username: config.user.username,
          os: this.config.platform,
          terminal: this.config.shell,
        },
      })
    } catch (err) {
      this.debug('%O', err)
      throw new AnalyticsError(err)
    }
  }

  createUser = async (input: SignUpData): Promise<UserCredentials> => {
    await this.api
      .create('users', {
        email: input.email,
        password: input.password,
        username: input.username,
      })
      .catch(err => {
        this.debug(err.error)
        throw new SignUpError(err)
      })
    const { email, password } = input
    return { email, password }
  }

  logCreatingAccount = (input: SignUpData) => {
    this.log('')
    this.ux.spinner.start(`${this.ux.colors.white('Creating account')}`)
    return { ...input }
  }

  askQuestions = async (questions: Question[]): Promise<SignUpData | {}> => {
    if (!questions.length) return {}
    return this.ux.prompt<Partial<SignUpData>>(questions)
  }

  logHelpMessage = () => {
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
    this.log('❔ Let us know if you have questions...')

    this.log(
      `📬  You can always reach us by ${this.ux.url(
        'email',
        `mailto:${INTERCOM_EMAIL}`,
      )} ${this.ux.colors.dim(`(${INTERCOM_EMAIL})`)}.\n`,
    )

    this.log(`⚡️  Let's get you ${this.ux.colors.callOutCyan('started')}...`)
  }

  async run() {
    try {
      this.logHelpMessage()

      const signupPipeline = asyncPipe(
        this.askQuestions,
        this.logCreatingAccount,
        this.createUser,
        this.signinFlow.bind(this),
        this.trackSignup,
        this.logConfirmationMessage,
      )

      await signupPipeline(this.questions)

      console.log(
        `\n💻  Now try running ${this.ux.colors.italic.dim(
          'ops search',
        )} to find some ops to run, or ${this.ux.colors.italic.dim(
          'ops init',
        )} to begin creating your own. \n\n`,
      )
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err })
    }
  }
}
