import fuzzy from 'fuzzy'
import Debug from 'debug'
import { ux } from '@cto.ai/sdk'
import { Answers, Fuzzy, SecretListInputs, Config, ApiService } from '~/types'
import { asyncPipe } from '~/utils/asyncPipe'
import { APIError, NoTeamSelected } from '~/errors/CustomErrors'

const debug = Debug('ops:SecretService')

export class SecretService {
  secrets: string[] = []

  getApiSecretsList = async (
    inputs: SecretListInputs,
  ): Promise<SecretListInputs> => {
    try {
      const { team, tokens } = inputs.config
      if (!team.id) {
        throw new NoTeamSelected('No team selected')
      }
      const { api } = inputs
      const findResponse = await api.find(`/teams/${team.name}/secrets`, {
        headers: {
          Authorization: tokens.accessToken,
        },
      })
      let { data: secrets } = findResponse
      return { ...inputs, secrets }
    } catch (err) {
      if (err instanceof NoTeamSelected) {
        throw err
      }
      debug('error: %O', err)
      throw new APIError(err)
    }
  }

  checkDataList = async (inputs: SecretListInputs) => {
    if (!inputs.secrets) {
      console.log(
        ux.colors.whiteBright(
          `\n 😞 No secrets found in your team. Try again or run ${ux.colors.callOutCyan(
            'ops team:switch',
          )} to switch your current team. \n`,
        ),
      )
      process.exit()
    }
    return inputs
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

  async runListPipeline(config: Config, api: ApiService) {
    try {
      const secretsListPipeline = asyncPipe(
        this.getApiSecretsList,
        this.checkDataList,
        this.secretKeyListSelectorPrompt,
      )
      const results = await secretsListPipeline({ config, api })
      return results
    } catch (err) {
      debug('%O', err)
    }
  }
}
