import { ux } from '@cto.ai/sdk'
import Command, { flags } from '~/base'
import { AlreadySignedOut, SignOutError } from '~/errors/CustomErrors'
import { asyncPipe } from '~/utils'

export default class AccountSignout extends Command {
  static description = 'Log out from your account.'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  checkForAccessToken = async () => {
    if (!this.accessToken) {
      throw new AlreadySignedOut()
    }
  }

  startSpinner = () => {
    this.log('')
    ux.spinner.start(
      `${ux.colors.white('Signing out of ')}${ux.colors.actionBlue(
        'CTO.ai ops',
      )}`,
    )
  }

  signUserOut = async () => {
    try {
      await this.clearConfig(this)
      const { tokens } = await this.readConfig()
      if (tokens && tokens.accessToken) {
        throw new SignOutError(null)
      }
    } catch (err) {
      throw new SignOutError(err)
    }
  }

  stopSpinner = () => {
    ux.spinner.stop(`${ux.colors.green('Done!')}`)
    this.log('')
  }

  logMessage = () => {
    this.log(
      `${ux.colors.green('✓')} Signed out! Type \'ops ${ux.colors.actionBlue(
        'account:signin',
      )}\' to sign back into your account.\n`,
    )
  }

  sendAnalytics = () => {
    this.services.analytics.track(
      {
        userId: this.user.email,
        teamId: this.team.id,
        event: 'Ops CLI Signout',
        properties: {
          email: this.user.email,
          username: this.user.username,
        },
      },
      this.accessToken,
    )
  }

  async run() {
    try {
      const signoutPipeline = asyncPipe(
        this.checkForAccessToken,
        this.startSpinner,
        this.signUserOut,
        this.stopSpinner,
        this.logMessage,
        this.sendAnalytics,
      )

      await signoutPipeline()
    } catch (err) {
      ux.spinner.stop(`${ux.colors.errorRed('Failed!')}`)
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
