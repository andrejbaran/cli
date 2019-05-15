import { ux } from '@cto.ai/sdk'
import { Config, UserCredentials, QuestionInquirer } from '~/types'
import Command, { flags } from '~/base'
import { INTERCOM_EMAIL, NODE_ENV } from '~/constants/env'
import { APIError, SignUpError, AnalyticsError } from '~/errors/customErrors'
import {
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
        throw new APIError(err)
      },
    )
    if (!unique)
      return '❗ Email is already used with another account, please try again using another.'
    return true
  }

  _validateUsername = async input => {
    try {
      const unique = await this.validateUniqueField({ username: input })
      if (!unique)
        return '😞 Username is already taken, please try using another.'
      return true
    } catch (err) {
      throw new APIError(err)
    }
  }

  questions: QuestionInquirer[] = [
    {
      type: 'input',
      name: 'email',
      message: `\n📩 Please enter your email ${ux.colors.reset.green(
        '→',
      )}  \n${ux.colors.white('Enter Email')}`,
      afterMessage: `${ux.colors.reset.green('✓')} Email`,
      afterMessageAppend: `${ux.colors.reset(' added!')}`,
      validate: this._validateEmail.bind(this),
    },
    {
      type: 'input',
      name: 'username',
      message: `\n🖖 Create a username to get started ${ux.colors.reset.green(
        '→',
      )}  \n${ux.colors.white('Enter Username')}`,
      afterMessage: `${ux.colors.reset.green('✓')} Username`,
      afterMessageAppend: `${ux.colors.reset(' created!')}`,
      validate: this._validateUsername.bind(this),
    },
    {
      type: 'password',
      name: 'password',
      mask: '*',
      message: `\n🔑 Let's create a password next ${ux.colors.reset.green(
        '→',
      )}  \n${ux.colors.white('Enter your password')}`,
      afterMessage: `${ux.colors.reset.green('✓')} Password added!`,
      validate: validatePasswordFormat,
    },
    {
      type: 'password',
      name: 'cpassword',
      mask: '*',
      message: '\n🔑 Confirm your password: ',
      afterMessage: `${ux.colors.reset.green('✓')} Password confirmed!`,
      validate: validateCpassword,
    },
  ]

  logConfimationMessage = () => {
    ux.spinner.stop(`${ux.colors.green('Done!')}`)

    this.log(
      `\n✅ ${ux.colors.white(
        'Your account is setup! You can now build, run and share ops!',
      )}`,
    )
    this.log(
      `🎉 ${ux.colors.white(
        'We just sent you an email with tips on how to get started!',
      )}\n`,
    )
  }

  trackSignup = (config: Config) => {
    try {
      if (NODE_ENV === 'production') {
        this.analytics.identify({
          userId: config.user.email,
          traits: {
            beta: true,
            email: config.user.email,
            username: config.user.username,
          },
        })
      }

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
    } catch (error) {
      throw new AnalyticsError(error)
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
        throw new SignUpError(err)
      })
    const { email, password } = input
    return { email, password }
  }

  logCreatingAccount = (input: SignUpData) => {
    this.log('')
    ux.spinner.start(`${ux.colors.white('Creating account')}`)
    return { ...input }
  }

  askQuestions = async (
    questions: QuestionInquirer[],
  ): Promise<SignUpData | {}> => {
    if (!questions.length) return {}
    return this.ux.prompt(questions)
  }

  logHelpMessage = () => {
    this.log('')
    this.log(
      `💻 ${ux.colors.multiBlue('CTO.ai Ops')} - ${ux.colors.actionBlue(
        'The CLI built for Teams',
      )} 🚀`,
    )
    this.log('')

    this.log(
      `👋 ${ux.colors.white('Welcome to the')} ${ux.colors.callOutCyan(
        'Ops CLI beta',
      )}! \n`,
    )
    this.log('❔ Let us know if you have questions...')

    this.log(
      `📬 You can always reach us by ${this.ux.url(
        'email',
        `mailto:${INTERCOM_EMAIL}`,
      )} ${this.ux.colors.dim(`(${INTERCOM_EMAIL})`)}.\n`,
    )

    this.log(`⚡️ Let's get you ${ux.colors.callOutCyan('started')}...`)
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
        this.logConfimationMessage,
      )

      await signupPipeline(this.questions)
    } catch (err) {
      this.config.runHook('error', { err })
    }
  }
}
