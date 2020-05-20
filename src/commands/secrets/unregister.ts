import Command from '~/base'
import { asyncPipe } from '~/utils'
import {
  APIError,
  AnalyticsError,
  NoSecretsProviderFound,
  NoTeamFound,
  UserUnauthorized,
} from '~/errors/CustomErrors'
import { Config } from '~/types'

interface UnregisterInput {
  config: Config
  confirmDelete: boolean
}

export default class UnregisterSecret extends Command {
  static description = 'Unregister a secrets provider for a team'

  unregisterConfirm = async (inputs): Promise<UnregisterInput> => {
    const { team } = this.state.config
    const { confirmDelete } = await this.ux.prompt<{ confirmDelete: boolean }>({
      type: 'confirm',
      name: 'confirmDelete',
      message: `Are you sure you want to remove the secret provider of the ${this.ux.colors.multiBlue(
        team.name,
      )} team?`,
    })

    return { ...inputs, confirmDelete }
  }

  unregisterAPI = async (inputs: UnregisterInput): Promise<UnregisterInput> => {
    try {
      if (!inputs.confirmDelete) return inputs
      this.log('\n🗑  Removing secret provider...')
      await this.services.api.remove(
        `/private/teams/${this.state.config.team.name}/secrets`,
        'unregister',
        {
          headers: {
            Authorization: this.state.config.tokens.accessToken,
          },
        },
      )
      return inputs
    } catch (err) {
      const [{ message, code }] = err.error
      if (message === 'team not found') {
        throw new NoTeamFound(this.state.config.team.name)
      }
      if (code === 403 || message === 'team not authorized') {
        throw new UserUnauthorized(err)
      }
      if (code === 404) {
        throw new NoSecretsProviderFound(err)
      }
      throw new APIError(err)
    }
  }

  logMessage = (inputs: UnregisterInput): UnregisterInput => {
    if (!inputs.confirmDelete) return inputs

    this.log(
      `\n⚡️ the secret provider has been ${this.ux.colors.red(
        'deleted',
      )} from the team ${this.ux.colors.multiBlue(
        this.state.config.team.name,
      )}!`,
    )

    return inputs
  }

  sendAnalytics = async (inputs: UnregisterInput) => {
    try {
      const { config } = inputs
      this.services.analytics.track(
        'Ops CLI Secrets:Unregister',
        {
          username: config.user.username,
          hasBeenDeleted: inputs.confirmDelete,
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
    const config = await this.isLoggedIn()
    try {
      const unregisterPipeline = asyncPipe(
        this.unregisterConfirm,
        this.unregisterAPI,
        this.sendAnalytics,
        this.logMessage,
      )
      await unregisterPipeline({ config })
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', {
        err,
        accessToken: config.tokens.accessToken,
      })
    }
  }
}
