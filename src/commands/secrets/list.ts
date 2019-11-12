import fuzzy from 'fuzzy'
import Command, { flags } from '~/base'
import { Answers, Fuzzy } from '~/types'
import { asyncPipe } from '~/utils/asyncPipe'
import { APIError, NoTeamSelected, AnalyticsError } from '~/errors/CustomErrors'

interface SecretListInputs {
  secrets: string[]
}

export default class SecretsList extends Command {
  static description = 'List all the keys that are stored for the active team'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  secrets: string[] = []

  getApiSecrets = async (
    inputs: SecretListInputs,
  ): Promise<SecretListInputs> => {
    try {
      if (this.state.config.team.id === '') {
        throw new NoTeamSelected('No team selected')
      }
      const findResponse = await this.services.api.find(
        `/teams/${this.state.config.team.name}/secrets`,
        {
          headers: {
            Authorization: this.state.config.tokens.accessToken,
          },
        },
      )
      let { data: secrets } = findResponse
      return { ...inputs, secrets }
    } catch (err) {
      if (err instanceof NoTeamSelected) {
        throw err
      }
      this.debug('error: %O', err)
      throw new APIError(err)
    }
  }

  checkData = async (inputs: SecretListInputs) => {
    if (!inputs.secrets) {
      this.log(
        this.ux.colors.whiteBright(
          `\n 😞 No secrets found in your team. Try again or run ${this.ux.colors.callOutCyan(
            'ops team:switch',
          )} to switch your current team. \n`,
        ),
      )
      process.exit()
    }
    return inputs
  }

  secretKeyListPrompt = async (
    inputs: SecretListInputs,
  ): Promise<SecretListInputs> => {
    this.log(
      this.ux.colors.bold(
        this.ux.colors.callOutCyan(
          `Secrets stored for team ${this.ux.colors.multiBlue(
            this.state.config.team.name,
          )}:`,
        ),
      ),
    )
    this.log(
      `To remove a secret from storage, run ${this.ux.colors.gray(
        'ops secrets:delete',
      )}`,
    )

    // Mantaining this one because of the Fuzzy filter, that I was not able to make it work with params
    this.secrets = inputs.secrets
    await this.ux.prompt<{
      selectedSecret: string
    }>({
      type: 'autocomplete',
      name: 'selectedSecret',
      pageSize: 5,
      message: this.ux.colors.reset.dim('🔍 Search:'),
      source: this._autocompleteSearch.bind(this),
    })
    return { ...inputs }
  }

  _autocompleteSearch = async (_: Answers, searchQuery = '') => {
    const { list, options } = this.fuzzyFilterParams()
    const fuzzyResult: Fuzzy[] = fuzzy.filter(searchQuery, list, options)
    return fuzzyResult.map(result => result.original)
  }

  private fuzzyFilterParams = () => {
    const list = this.secrets.map(secret => {
      return {
        name: secret,
        value: secret,
      }
    })
    const options = { extract: el => el.name }
    return { list, options }
  }

  sendAnalytics = (inputs: SecretListInputs) => async () => {
    try {
      this.services.analytics.track(
        {
          userId: this.user.email,
          teamId: this.team.id,
          cliEvent: 'Secrets CLI List',
          event: 'Secrets CLI List',
          properties: {
            email: this.user.email,
            username: this.user.username,
            results: inputs.secrets.length,
          },
        },
        this.state.config.tokens.accessToken,
      )
    } catch (err) {
      this.debug('%O', err)
      throw new AnalyticsError(err)
    }
  }

  async run() {
    try {
      await this.isLoggedIn()

      const searchPipeline = asyncPipe(
        this.getApiSecrets,
        this.checkData,
        this.secretKeyListPrompt,
        this.sendAnalytics,
      )
      await searchPipeline()
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err })
    }
  }
}
