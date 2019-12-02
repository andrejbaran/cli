import Command from '~/base'
import { asyncPipe } from '~/utils'
import {
  APIError,
  AnalyticsError,
  NoSecretsProviderFound,
  NoTeamFound,
  UserUnauthorized,
} from '~/errors/CustomErrors'

interface UnregisterInput {
  confirmDelete: boolean
}

export default class UnregisterSecret extends Command {
  static description = 'Unregister a secrets provider for a team'

  unregisterConfirm = async (): Promise<UnregisterInput> => {
    const { team } = this.state.config
    const { confirmDelete } = await this.ux.prompt<{ confirmDelete: boolean }>({
      type: 'confirm',
      name: 'confirmDelete',
      message: `Are you sure you want to remove the secret provider of the ${this.ux.colors.multiBlue(
        team.name,
      )} team?`,
    })

    return { confirmDelete }
  }

  unregisterAPI = async (inputs: UnregisterInput): Promise<UnregisterInput> => {
    try {
      if (!inputs.confirmDelete) return inputs
      this.log('\n🗑  Removing secret provider...')
      await this.services.api.remove(
        `/teams/${this.state.config.team.name}/secrets`,
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
      const { user, team, tokens } = this.state.config
      this.services.analytics.track(
        {
          userId: user.email,
          teamId: team.id,
          cliEvent: 'Secrets CLI Unregister',
          event: 'Secrets CLI Unregister',
          properties: {
            email: user.email,
            username: user.username,
            hasBeenDeleted: inputs.confirmDelete,
            team: team.name,
          },
        },
        tokens.accessToken,
      )
      return inputs
    } catch (err) {
      this.debug('%O', err)
      throw new AnalyticsError(err)
    }
  }

  async run() {
    try {
      await this.isLoggedIn()

      const unregisterPipeline = asyncPipe(
        this.unregisterConfirm,
        this.unregisterAPI,
        this.sendAnalytics,
        this.logMessage,
      )
      await unregisterPipeline()
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', {
        err,
        accessToken: this.state.config.tokens.accessToken,
      })
    }
  }
}
