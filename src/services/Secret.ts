import fuzzy from 'fuzzy'
import Debug from 'debug'
import { ux } from '@cto.ai/sdk'
import { Answers, Fuzzy, SecretListInputs, Config, ApiService } from '~/types'
import { asyncPipe } from '~/utils/asyncPipe'
import {
  APIError,
  NoSecretsProviderFound,
  NoSecretsOnTeam,
  NoTeamFound,
  TeamUnauthorized,
  InvalidSecretVault,
  InvalidSecretToken,
  RegisterSecretsProvider,
} from '~/errors/CustomErrors'

const debug = Debug('ops:SecretService')

export class SecretService {
  secrets: string[] = []

  getApiSecretsList = async (
    inputs: SecretListInputs,
  ): Promise<SecretListInputs> => {
    const { team, tokens } = inputs.config
    try {
      const { api } = inputs
      const findResponse = await api.find(
        `/private/teams/${team.name}/secrets`,
        {
          headers: {
            Authorization: tokens.accessToken,
          },
        },
      )
      let { data: secrets } = findResponse
      return { ...inputs, secrets }
    } catch (err) {
      debug('error: %O', err)
      switch (err.error[0].code) {
        case 204:
          throw new NoSecretsOnTeam(err)
        case 400:
          throw new InvalidSecretVault(err)
        case 401:
          throw new TeamUnauthorized(
            'Team not authorized when fetching the secrets list',
          )
        case 403:
          if (err.error[0].message.includes('invalid secret token')) {
            throw new InvalidSecretToken(err)
          } else {
            throw new NoSecretsProviderFound(err)
          }
        case 404:
          throw new NoTeamFound(team.name)
        default:
          throw new NoSecretsProviderFound(err)
      }
    }
  }

  checkDataList = async (inputs: SecretListInputs) => {
    if (inputs.secrets) return inputs
    console.log(
      ux.colors.whiteBright(
        `\n😞 No secrets found in your team. Try again or run ${ux.colors.callOutCyan(
          'ops team:switch',
        )} to switch your current team. \n`,
      ),
    )
    process.exit()
  }

  secretKeyListSelectorPrompt = async (
    inputs: SecretListInputs,
  ): Promise<SecretListInputs> => {
    const { team } = inputs.config
    console.log(
      ux.colors.bold(
        ux.colors.callOutCyan(
          `Secrets stored for team ${ux.colors.multiBlue(team.name)}:`,
        ),
      ),
    )

    // Mantaining this one because of the Fuzzy filter, that I was not able to make it work with params
    this.secrets = inputs.secrets
    const { selectedSecret } = await ux.prompt<{
      selectedSecret: string
    }>({
      type: 'autocomplete',
      name: 'selectedSecret',
      pageSize: 5,
      message: ux.colors.reset.dim('🔍 Search:'),
      source: this._autocompleteSearchList.bind(this),
    })
    return { ...inputs, selectedSecret }
  }

  checkForSecretProviderErrors = async (
    api: ApiService,
    config: Config,
  ): Promise<undefined | Error> => {
    try {
      await this.getApiSecretsList({
        api,
        config,
        secrets: [],
        selectedSecret: '',
      })
    } catch (err) {
      return err
    }

    return undefined
  }

  _autocompleteSearchList = async (_: Answers, searchQuery = '') => {
    const { list, options } = this.fuzzyFilterParamsList()
    const fuzzyResult: Fuzzy[] = fuzzy.filter(searchQuery, list, options)
    return fuzzyResult.map(result => result.original)
  }

  private fuzzyFilterParamsList = () => {
    const list = this.secrets.map(secret => {
      return {
        name: secret,
        value: secret,
      }
    })
    const options = { extract: el => el.name }
    return { list, options }
  }

  async runListPipeline(
    config: Config,
    api: ApiService,
  ): Promise<SecretListInputs> {
    try {
      const secretsListPipeline = asyncPipe(
        this.getApiSecretsList,
        this.checkDataList,
        this.secretKeyListSelectorPrompt,
      )
      const results: SecretListInputs = await secretsListPipeline({
        config,
        api,
      })
      return results
    } catch (err) {
      debug('%O', err)
      throw err
    }
  }
}
