import Command, { flags } from '../../base'
import { ux } from '@cto.ai/sdk'
import { INTERCOM_EMAIL } from '../..//constants/env'
import { Config } from '../../types'
import { APIError, AnalyticsError } from '../../errors/customErrors'

let self
export default class AccountSignup extends Command {
  static description = 'Creates an account to use with ops CLI.'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  questions = [
    {
      type: 'input',
      name: 'email',
      message: `\n📩 Please enter your email ${ux.colors.reset.green(
        '→',
      )}  \n${ux.colors.white('Enter Email')}`,
      afterMessage: `${ux.colors.reset.green('✓')} Email`,
      afterMessageAppend: `${ux.colors.reset(' added!')}`,
      validate: this._validateEmail,
    },
    {
      type: 'input',
      name: 'username',
      message: `\n🖖 Create a username to get started ${ux.colors.reset.green(
        '→',
      )}  \n${ux.colors.white('Enter Username')}`,
      afterMessage: `${ux.colors.reset.green('✓')} Username`,
      afterMessageAppend: `${ux.colors.reset(' created!')}`,
      validate: this._validateUsername,
    },
    {
      type: 'password',
      name: 'password',
      mask: '*',
      message: `\n🔑 Let's create a password next ${ux.colors.reset.green(
        '→',
      )}  \n${ux.colors.white('Enter your password')}`,
      afterMessage: `${ux.colors.reset.green('✓')} Password added!`,
      validate: this._validatePasswordFormat,
    },
    {
      type: 'password',
      name: 'cpassword',
      mask: '*',
      message: '\n🔑 Confirm your password: ',
      afterMessage: `${ux.colors.reset.green('✓')} Password confirmed!`,
      validate: this._validateCpassword,
    },
  ]

  async run() {
    try {
      self = this
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

      const { password, email, username } = await ux.prompt(this.questions)

      this.log('')
      ux.spinner.start(`${ux.colors.white('Creating account')}`)

      await this.api.create('users', { email, password, username })

      const config: Config = await this.signinFlow({ email, password })

      // This is wrapped in an if statement because it takes a while to finish executing.
      // The `nock` code that is supposed to intercept this call and counter it is not equipped
      // to handle this
      try {
        if (process.env.NODE_ENV !== 'test') {
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
      } catch (err) {
        throw new AnalyticsError(err)
      }

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
    } catch (err) {
      this.config.runHook('error', { err })
    }
  }
  async _validateEmail(input: string) {
    if (!/\S+@\S+\.\S+/.test(input))
      return '❗ The format of your email is invalid, please check that it is correct and try again.'
    const unique = await self
      .validateUniqueField({ email: input })
      .catch(err => {
        throw new APIError(err)
      })
    if (!unique)
      return '❗ Email is already used with another account, please try again using another.'
    return true
  }

  async _validateUsername(input) {
    try {
      const unique = await self.validateUniqueField({ username: input })
      if (!unique)
        return '😞 Username is already taken, please try using another.'
      return true
    } catch (err) {
      throw new APIError(err)
    }
  }

  _validatePasswordFormat(input) {
    if (input.length < 8)
      return `❗ This password is too short, please choose a password that is at least 8 characters long`
    return true
  }

  _validateCpassword(input, answers) {
    if (input !== answers.password) {
      return `❗ Password doesn't match, please try again.`
    }
    return true
  }
}
