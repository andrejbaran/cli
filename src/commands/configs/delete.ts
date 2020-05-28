import Command, { flags } from '~/base'
import { asyncPipe } from '~/utils'
import { Config } from '~/types'
import { APIError, AnalyticsError } from '~/errors/CustomErrors'

export interface ConfigDeleteInput {
  selectedConfig: string
  confirmDelete: boolean
  config: Config
}

export default class ConfigsDelete extends Command {
  static description = 'Delete a config stored for the active team'

  static flags = {
    help: flags.help({ char: 'h' }),
    key: flags.string({ char: 'k', description: 'Secret Key Name' }),
  }

  confirmConfigDeletion = async (
    inputs: ConfigDeleteInput,
  ): Promise<ConfigDeleteInput> => {
    const { selectedConfig } = inputs
    const { confirmDelete } = await this.ux.prompt<{ confirmDelete: boolean }>({
      type: 'confirm',
      name: 'confirmDelete',
      message: `Are you sure you want to remove ${this.ux.colors.multiBlue(
        selectedConfig,
      )} from team ${this.ux.colors.multiBlue(this.state.config.team.name)}?`,
    })

    return { ...inputs, confirmDelete }
  }

  deleteConfigAPI = async (
    inputs: ConfigDeleteInput,
  ): Promise<ConfigDeleteInput> => {
    try {
      const {
        confirmDelete,
        selectedConfig,
        config: { team, tokens },
      } = inputs
      if (!confirmDelete) return inputs
      await this.services.api.remove(
        `/private/teams/${team.name}/configs`,
        selectedConfig,
        {
          headers: {
            Authorization: tokens.accessToken,
          },
        },
      )
      return inputs
    } catch (err) {
      throw new APIError(err)
    }
  }

  logMessage = (inputs: ConfigDeleteInput): ConfigDeleteInput => {
    if (!inputs.confirmDelete) return inputs

    this.log(
      `\n⚡️ the config ${this.ux.colors.multiBlue(
        inputs.selectedConfig,
      )} has been ${this.ux.colors.red(
        'deleted',
      )} from the team ${this.ux.colors.multiBlue(inputs.config.team.name)}!`,
    )

    return inputs
  }

  sendAnalytics = async (inputs: ConfigDeleteInput) => {
    try {
      const { config, confirmDelete, selectedConfig } = inputs
      this.services.analytics.track(
        'Ops CLI Configs:Delete',
        {
          username: config.user.username,
          hasBeenDeleted: confirmDelete,
          deletedConfigKey: selectedConfig,
        },
        config,
      )
      return inputs
    } catch (err) {
      this.debug('%O', err)
      throw new AnalyticsError(err)
    }
  }

  async run() {
    let {
      flags: { key },
    } = this.parse(ConfigsDelete)

    try {
      const config = await this.isLoggedIn()

      if (!key) {
        const {
          selectedConfig,
        } = await this.services.configService.runListPipeline(
          this.state.config,
          this.services.api,
        )
        ;({ key } = selectedConfig)
      }

      const teamConfigsDeletePipeline = asyncPipe(
        this.confirmConfigDeletion,
        this.deleteConfigAPI,
        this.sendAnalytics,
        this.logMessage,
      )

      await teamConfigsDeletePipeline({ config, selectedConfig: key })
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
