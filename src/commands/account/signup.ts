import Command, { flags } from '~/base'
import { INTERCOM_EMAIL } from '~/constants/env'
import { asyncPipe, terminalText } from '~/utils'
import { AnalyticsError, SSOError } from '~/errors/CustomErrors'
import { Config, Tokens } from '~/types'

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

  logSignupWelcomeMessage = () => {
    this.log(`\n🎉 Account sign up complete - Ready to go!\n`)

    this.log(
      `${this.ux.colors.actionBlue(
        `You're ready to build and share Ops with your team!`,
      )}`,
    )
    this.log(`Get started by trying the following commands:\n`)

    this.log(`${this.ux.colors.reset.green('→')} Search for an Op`)
    this.log(`  ${terminalText('ops search')}\n`)

    this.log(`${this.ux.colors.reset.green('→')} Create an Op`)
    this.log(`  ${terminalText('ops init')}\n`)

    this.log(`${this.ux.colors.reset.green('→')} Publish an Op`)
    this.log(`  ${terminalText('ops publish')}\n`)
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

  sendAnalytics = (config: Config) => {
    try {
      this.services.analytics.track(
        'Ops CLI Signup',
        {
          username: config.user.username,
        },
        config,
      )
    } catch (err) {
      this.debug('%O', err)
      throw new AnalyticsError(err)
    }
  }

  async run() {
    this.parse(AccountSignup)
    try {
      await this.services.keycloakService.init()
      this.logHelpMessage()
      await this.invalidateKeycloakSession()

      const signupPipeline = asyncPipe(
        this.keycloakSignUpFlow,
        this.initConfig,
        this.sendAnalytics,
      )

      await signupPipeline()

      this.logSignupWelcomeMessage()
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err })
    }
  }
}
