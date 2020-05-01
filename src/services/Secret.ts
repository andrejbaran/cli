import fuzzy from 'fuzzy'
import Debug from 'debug'
import { ux } from '@cto.ai/sdk'
import { Answers, Fuzzy, SecretListInputs, Config, ApiService } from '~/types'
import { asyncPipe, terminalText } from '~/utils'
import {
  NoSecretsProviderFound,
  NoSecretsOnTeam,
  NoTeamFound,
  TeamUnauthorized,
  InvalidSecretVault,
  InvalidSecretToken,
} from '~/errors/CustomErrors'

const debug = Debug('ops:SecretService')

const { bold, callOutCyan, multiBlue, reset, whiteBright } = ux.colors

export class SecretService {
  secrets: string[] = []

  getApiSecretsList = async (
    inputs: Omit<SecretListInputs, 'storageEngine'>,
  ): Promise<SecretListInputs> => {
    const { team, tokens } = inputs.config
    try {
      const { api } = inputs
      const { data } = await api.find(`/private/teams/${team.name}/secrets`, {
        headers: {
          Authorization: tokens.accessToken,
        },
      })
      let { secrets, storageEngine } = data[0]
      return { ...inputs, secrets, storageEngine }
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
    if (inputs.secrets.length !== 0) return inputs
    const {
      config: {
        team: { name },
      },
      storageEngine,
    } = inputs
    console.log(
      whiteBright(
        `\n😞 No secrets found for team ${multiBlue(
          name,
        )} stored with ${multiBlue(
          storageEngine,
        )}.\n   Try again or run ${terminalText(
          'ops team:switch',
        )} to switch your current team. \n`,
      ),
    )
    process.exit()
  }

  secretKeyListSelectorPrompt = async (
    inputs: SecretListInputs,
  ): Promise<SecretListInputs> => {
    const {
      config: { team },
      storageEngine,
    } = inputs
    console.log(
      bold(
        callOutCyan(
          ` Listing all secrets for team ${multiBlue(
            team.name,
          )} stored with ${multiBlue(storageEngine)} ${reset.green('→')}`,
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
