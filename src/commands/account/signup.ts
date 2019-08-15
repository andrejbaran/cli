import Command, { flags } from '~/base'
import { INTERCOM_EMAIL } from '~/constants/env'
import { asyncPipe } from '../../utils/asyncPipe'
import { SSOError } from '~/errors/CustomErrors'
import { Tokens } from '~/types'

export default class AccountSignup extends Command {
  static description = 'Creates an account to use with ops CLI.'

  static flags = {
    help: flags.help({ char: 'h' }),
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

  keycloakSignUpFlow = async (): Promise<Tokens> => {
    this.ux.spinner.start('Authenticating using Single Sign On')
    const tokens = await this.services.keycloakService
      .keycloakSignUpFlow()
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

  async run() {
    try {
      const signupPipeline = asyncPipe(
        this.logHelpMessage,
        this.keycloakSignUpFlow,
        this.signin,
      )

      await signupPipeline()
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err })
    }
  }
}
