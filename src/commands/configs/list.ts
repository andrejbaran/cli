import Command, { flags } from '~/base'
import { asyncPipe } from '~/utils'
import { AnalyticsError } from '~/errors/CustomErrors'
import { ConfigListInputs } from '~/services/Config'
export default class ConfigsList extends Command {
  static description =
    'List all the configs that are stored for the active team'

  static flags = { help: flags.help({ char: 'h' }) }

  logConfigValue = async (inputs: ConfigListInputs) => {
    this.log('')
    this.log(inputs.selectedConfig.value)
    return inputs
  }

  sendAnalytics = async (inputs: ConfigListInputs) => {
    try {
      const { config, teamConfigs } = inputs
      this.services.analytics.track(
        'Ops CLI Configs:List',
        {
          username: config.user.username,
          results: teamConfigs.length,
        },
        config,
      )
    } catch (err) {
      this.debug('%O', err)
      throw new AnalyticsError(err)
    }
  }

  async run() {
    this.parse(ConfigsList)

    try {
      const config = await this.isLoggedIn()
      const configsListPipeline = asyncPipe(
        this.logConfigValue,
        this.sendAnalytics,
      )
      const inputs = await this.services.configService.runListPipeline(
        config,
        this.services.api,
      )
      await configsListPipeline(inputs)
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
