import Command, { flags } from '../../base'
import { ux } from '@cto.ai/sdk'

export default class AccountSignout extends Command {
  static description = 'Log out from your account.'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  async run() {
    try {
      if (!this.accessToken) {
        return this.log(
          `\nYou are already signed out. Type \'${ux.colors.actionBlue(
            'ops account:signin',
          )}\' to sign back into your account.`,
        )
      }

      this.log('')
      ux.spinner.start(
        `${ux.colors.white('Signing out of ')}${ux.colors.actionBlue(
          'CTO.ai ops',
        )}`,
      )

      await this.clearConfig(this)

      ux.spinner.stop(`${ux.colors.green('Done!')}`)
      this.log('')

      const { accessToken } = await this.readConfig()

      if (!accessToken) {
        this.log(
          `${ux.colors.green(
            '✓',
          )} Signed out! Type \'ops ${ux.colors.actionBlue(
            'account:signin',
          )}\' to sign back into your account.`,
        )
      }

      this.analytics.track({
        userId: this.user.email,
        event: 'Ops CLI Signout',
        properties: {
          email: this.user.email,
          username: this.user.username,
        },
      })
    } catch (err) {
      this.config.runHook('error', { err })
    }
  }
}
