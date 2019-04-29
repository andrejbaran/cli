import Command, { flags } from '../../base'
import { ux } from '@cto.ai/sdk'

let self
export default class AccountSignup extends Command {
  static description = 'Creates an account to use with ops CLI'

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
      `📬 You can always reach us by ${ux.url(
        'email',
        'mailto:h1gw0mit@ctoai.intercom-mail.com',
      )}.\n`,
    )

    this.log(`⚡️ Let's get you ${ux.colors.callOutCyan('started')}...`)

    const { password, email, username } = await ux.prompt(this.questions)

    this.log('')
    ux.spinner.start(`${ux.colors.white('Creating account')}`)

    await this.client.service('users').create({ email, password, username })
    const config = await this.signinFlow({ email, password })

    if (!config) {
      throw new Error('could not authenticate')
    }

    // This is wrapped in an if statement because it takes a while to finish executing.
    // The `nock` code that is supposed to intercept this call and counter it is not equipped
    // to handle this
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
  async _validateEmail(input: string) {
    try {
      if (!/\S+@\S+\.\S+/.test(input)) return 'Invalid email format'
      const unique = await self.validateUniqueField({ email: input })
      if (!unique) return 'Email is taken, please use another.'
      return true
    } catch (err) {
      return 'Unable to validate Email'
    }
  }

  async _validateUsername(input) {
    try {
      const unique = await self.validateUniqueField({ username: input })
      if (!unique) return 'Username is taken, please use another.'
      return true
    } catch (err) {
      return 'Unable to validate Username.'
    }
  }

  _validateCpassword(input, answers) {
    if (input !== answers.password) {
      return "Password doesn't match, please try again."
    }
    return true
  }
}
