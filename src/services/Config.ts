import fuzzy from 'fuzzy'
import Debug from 'debug'
import { ux } from '@cto.ai/sdk'
import { Answers, Fuzzy, Config, ApiService } from '~/types'
import { asyncPipe, terminalText } from '~/utils'
import { APIError } from '~/errors/CustomErrors'

const debug = Debug('ops:ConfigService')

const { bold, callOutCyan, multiBlue, reset, whiteBright } = ux.colors

export interface TeamConfig {
  key: string
  value: string
}

export interface ConfigListInputs {
  config: Config
  api: ApiService
  teamConfigs: TeamConfig[]
  selectedConfig: TeamConfig
}

export class ConfigService {
  teamConfigs: TeamConfig[] = []

  getApiConfigsList = async (
    inputs: ConfigListInputs,
  ): Promise<ConfigListInputs> => {
    const {
      config: {
        team: { name: teamName },
        tokens: { accessToken },
      },
      api,
    } = inputs
    try {
      const {
        data: teamConfigs,
      }: {
        data: TeamConfig[]
      } = await api.find(`/private/teams/${teamName}/configs`, {
        headers: {
          Authorization: accessToken,
        },
      })
      if (!teamConfigs.length) {
        console.log(
          whiteBright(
            `\n😞 No configs found for team ${multiBlue(
              teamName,
            )}.\n   Try again or run ${terminalText(
              'ops team:switch',
            )} to switch your current team. \n`,
          ),
        )
        process.exit()
      }
      return { ...inputs, teamConfigs }
    } catch (err) {
      throw new APIError(err)
    }
  }

  teamConfigSelectorPrompt = async (
    inputs: ConfigListInputs,
  ): Promise<ConfigListInputs> => {
    const {
      config: { team },
      teamConfigs,
    } = inputs
    console.log(
      bold(
        callOutCyan(
          ` Listing all configs for team ${multiBlue(team.name)} ${reset.green(
            '→',
          )}`,
        ),
      ),
    )

    this.teamConfigs = teamConfigs
    const { selectedConfig } = await ux.prompt<{
      selectedConfig: TeamConfig
    }>({
      type: 'autocomplete',
      name: 'selectedConfig',
      pageSize: 5,
      message: ux.colors.reset.dim('🔍 Search:'),
      source: this._autocompleteConfigList.bind(this),
    })
    return { ...inputs, selectedConfig }
  }

  _autocompleteConfigList = async (_: Answers, searchQuery = '') => {
    const { list, options } = this.fuzzyFilterParamsList()
    const fuzzyResult: Fuzzy[] = fuzzy.filter(searchQuery, list, options)
    return fuzzyResult.map(result => result.original)
  }

  private fuzzyFilterParamsList = () => {
    const list = this.teamConfigs.map(config => {
      return {
        name: config.key,
        value: config,
      }
    })
    const options = { extract: el => el.name }
    return { list, options }
  }

  async runListPipeline(
    config: Config,
    api: ApiService,
  ): Promise<ConfigListInputs> {
    try {
      const configsListPipeline = asyncPipe(
        this.getApiConfigsList,
        this.teamConfigSelectorPrompt,
      )
      const results: ConfigListInputs = await configsListPipeline({
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
