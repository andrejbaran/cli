import Command, { flags } from '~/base'
import { SecretListInputs } from '~/types'
import { asyncPipe } from '~/utils/asyncPipe'
import {
  APIError,
  AnalyticsError,
  NoTeamSelected,
  NoSecretsProviderFound,
  NoSecretFound,
} from '~/errors/CustomErrors'

interface SecretDeleteInput {
  selectedSecret: string
  confirmDelete: boolean
}

export default class SecretsDelete extends Command {
  static description = 'Delete a secret stored for the active team'

  public static flags = {
    help: flags.help({ char: 'h' }),
    key: flags.string({ char: 'k', description: 'Secret Key Name' }),
  }

  confirmSecretDeletion = async (
    inputs: Pick<SecretListInputs, 'selectedSecret'>,
  ): Promise<SecretDeleteInput> => {
    const { selectedSecret } = inputs
    if (typeof selectedSecret === 'undefined') {
      throw new NoSecretFound()
    }
    if (!this.state.config.team.id) {
      throw new NoTeamSelected('No team selected')
    }
    const { confirmDelete } = await this.ux.prompt<{ confirmDelete: boolean }>({
      type: 'confirm',
      name: 'confirmDelete',
      message: `Are you sure you want to remove ${this.ux.colors.multiBlue(
        selectedSecret,
      )} from team ${this.ux.colors.multiBlue(this.state.config.team.name)}?`,
    })

    return { selectedSecret, confirmDelete }
  }

  deleteSecretAPI = async (
    inputs: SecretDeleteInput,
  ): Promise<SecretDeleteInput> => {
    try {
      if (!inputs.confirmDelete) return inputs
      this.log('\n 🗑  Removing secret...')
      await this.services.api.remove(
        `/teams/${this.state.config.team.name}/secret`,
        inputs.selectedSecret,
        {
          headers: {
            Authorization: this.state.config.tokens.accessToken,
          },
        },
      )
      return inputs
    } catch (err) {
      if (err.error[0].message === 'no secrets provider registered') {
        throw new NoSecretsProviderFound(err)
      }
      throw new APIError(err)
    }
  }

  logMessage = (inputs: SecretDeleteInput): SecretDeleteInput => {
    if (!inputs.confirmDelete) return inputs

    this.log(
      `\n ⚡️ the secret ${this.ux.colors.multiBlue(
        inputs.selectedSecret,
      )} has been ${this.ux.colors.red(
        'deleted',
      )} from the team ${this.ux.colors.multiBlue(
        this.state.config.team.name,
      )}!`,
    )

    return inputs
  }

  sendAnalytics = async (inputs: SecretDeleteInput) => {
    try {
      this.services.analytics.track(
        {
          userId: this.state.config.user.email,
          teamId: this.state.config.team.id,
          cliEvent: 'Secrets CLI Delete',
          event: 'Secrets CLI Delete',
          properties: {
            email: this.state.config.user.email,
            username: this.state.config.user.username,
            hasBeenDeleted: inputs.confirmDelete,
            deletedSecretKey: inputs.selectedSecret,
          },
        },
        this.state.config.tokens.accessToken,
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
    } = this.parse(SecretsDelete)
    try {
      await this.isLoggedIn()

      const inputs = key
        ? { selectedSecret: key }
        : await this.services.secretService.runListPipeline(
            this.state.config,
            this.services.api,
          )

      const secretDeletePipeline = asyncPipe(
        this.confirmSecretDeletion,
        this.deleteSecretAPI,
        this.sendAnalytics,
        this.logMessage,
      )

      await secretDeletePipeline(inputs)
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err })
    }
  }
}
