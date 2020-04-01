import Command, { flags } from '~/base'
import { SecretListInputs } from '~/types'
import { asyncPipe } from '~/utils/asyncPipe'
import { AnalyticsError } from '~/errors/CustomErrors'

export default class SecretsList extends Command {
  static description = 'List all the keys that are stored for the active team'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  sendAnalytics = (inputs: SecretListInputs) => async () => {
    try {
      this.services.analytics.track(
        {
          userId: this.state.config.user.email,
          teamId: this.state.config.team.id,
          cliEvent: 'Ops CLI Secrets:List',
          event: 'Ops CLI Secrets:List',
          properties: {
            email: this.state.config.user.email,
            username: this.state.config.user.username,
            results: inputs.secrets.length,
          },
        },
        this.state.config.tokens.accessToken,
      )
    } catch (err) {
      this.debug('%O', err)
      throw new AnalyticsError(err)
    }
  }

  async run() {
    try {
      await this.isLoggedIn()

      const secretsListAnalyticsPipeline = asyncPipe(this.sendAnalytics)

      const inputs = await this.services.secretService.runListPipeline(
        this.state.config,
        this.services.api,
      )

      await secretsListAnalyticsPipeline(inputs)
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err })
    }
  }
}
