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
      const { config, secrets } = inputs
      this.services.analytics.track(
        'Ops CLI Secrets:List',
        {
          username: config.user.username,
          results: secrets.length,
        },
        config,
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
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
