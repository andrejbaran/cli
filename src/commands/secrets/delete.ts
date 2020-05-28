import Command, { flags } from '~/base'
import { SecretListInputs, Config } from '~/types'
import { asyncPipe } from '~/utils/asyncPipe'
import {
  AnalyticsError,
  NoSecretsProviderFound,
  NoSecretFound,
  UserUnauthorized,
  InvalidSecretToken,
  InvalidSecretVault,
  SecretNotFound,
} from '~/errors/CustomErrors'

interface SecretDeleteInput {
  config: Config
  selectedSecret: string
  confirmDelete: boolean
}

export default class SecretsDelete extends Command {
  static description = 'Delete a secret stored for the active team'

  public static flags = {
    help: flags.help({ char: 'h' }),
    key: flags.string({ char: 'k', description: 'Secret Key Name' }),
  }

  confirmSecretDeletion = async (inputs): Promise<SecretDeleteInput> => {
    const { selectedSecret } = inputs
    if (typeof selectedSecret === 'undefined') {
      throw new NoSecretFound()
    }

    const { confirmDelete } = await this.ux.prompt<{ confirmDelete: boolean }>({
      type: 'confirm',
      name: 'confirmDelete',
      message: `Are you sure you want to remove ${this.ux.colors.multiBlue(
        selectedSecret,
      )} from team ${this.ux.colors.multiBlue(this.state.config.team.name)}?`,
    })

    return { ...inputs, selectedSecret, confirmDelete }
  }

  deleteSecretAPI = async (
    inputs: SecretDeleteInput,
  ): Promise<SecretDeleteInput> => {
    try {
      if (!inputs.confirmDelete) return inputs
      this.log('\n 🗑  Removing secret...')
      await this.services.api.remove(
        `/private/teams/${this.state.config.team.name}/secret`,
        inputs.selectedSecret,
        {
          headers: {
            Authorization: this.state.config.tokens.accessToken,
          },
        },
      )
      return inputs
    } catch (err) {
      switch (err.error[0].code) {
        case 400:
          throw new InvalidSecretVault(err)
        case 401:
          throw new UserUnauthorized(err)
        case 403:
          if (err.error[0].message.includes('invalid secret token')) {
            throw new InvalidSecretToken(err)
          } else {
            throw new NoSecretsProviderFound(err)
          }
        case 404:
          throw new SecretNotFound(err)
        default:
          throw new NoSecretsProviderFound(err)
      }
    }
  }

  logMessage = (inputs: SecretDeleteInput): SecretDeleteInput => {
    if (!inputs.confirmDelete) return inputs

    this.log(
      `\n⚡️ the secret ${this.ux.colors.multiBlue(
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
      const {
        config,
        confirmDelete: hasBeenDeleted,
        selectedSecret: deletedSecretKey,
      } = inputs
      this.services.analytics.track(
        'Ops CLI Secrets:Delete',
        {
          username: config.user.username,
          hasBeenDeleted,
          deletedSecretKey,
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
    } = this.parse(SecretsDelete)
    const config = await this.isLoggedIn()
    try {
      const inputs: { selectedSecret: string } = key
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

      await secretDeletePipeline({ ...inputs, config })
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err })
    }
  }
}
