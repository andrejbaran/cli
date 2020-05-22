import Command, { flags } from '~/base'
import { APIError, ConfigError } from '~/errors/CustomErrors'
import { Config, Team } from '~/types'
import { asyncPipe } from '~/utils'
interface displayTeam extends Team {
  displayName: string
}

export interface ListInputs {
  activeTeam: Team
  teams: Team[]
  displayTeams: displayTeam[]
  config: Config
}

export default class TeamList extends Command {
  static description = 'Shows the list of your teams.'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  getActiveTeam = async (inputs: ListInputs): Promise<ListInputs> => {
    try {
      if (!inputs.config.team) throw new Error()
      return { ...inputs, activeTeam: inputs.config.team }
    } catch (err) {
      this.debug('%O', err)
      throw new ConfigError(err)
    }
  }

  getTeamsFromApi = async (inputs: ListInputs): Promise<ListInputs> => {
    try {
      const { data: teams } = await this.services.api.find('/private/teams', {
        headers: { Authorization: inputs.config.tokens.accessToken },
      })
      return { ...inputs, teams }
    } catch (err) {
      this.debug('%O', err)
      throw new APIError(err)
    }
  }

  setTeamsDisplayName = (inputs: ListInputs): ListInputs => {
    const { teams, activeTeam } = inputs
    const displayTeams = teams.map(t => {
      // If the team is the user's active team, add custom styling to it
      if (activeTeam && t.name === activeTeam.name) {
        return {
          ...t,
          displayName: `${this.ux.colors.blue(t.name)} ${this.ux.colors.dim(
            '[Active]',
          )}`,
        }
      }
      // If the team isn't the user's active team, simply copy the display name from the team name
      return { ...t, displayName: t.name }
    })
    return { ...inputs, displayTeams }
  }

  printTeams = async (inputs: ListInputs): Promise<ListInputs> => {
    this.log("Here's the list of your teams:\n")
    const { displayTeams } = inputs
    await this.ux.print(
      displayTeams
        .map((value: displayTeam) => {
          return ` • ${value.displayName}`
        })
        .join('\n'),
    )
    return { ...inputs }
  }

  sendAnalytics = (inputs: ListInputs) => {
    const { config, teams } = inputs
    this.services.analytics.track(
      'Ops CLI Team:List',
      {
        username: config.user.username,
        results: teams.length,
      },
      config,
    )
  }
  startSpinner = async (inputs: ListInputs) => {
    await this.ux.spinner.start(
      `🔍 ${this.ux.colors.white('Searching for your teams')}`,
    )
    return inputs
  }
  stopSpinner = async (inputs: ListInputs) => {
    await this.ux.spinner.stop(`${this.ux.colors.successGreen('Done')}`)
    return inputs
  }
  async run() {
    await this.parse(TeamList)
    const config = await this.isLoggedIn()
    try {
      const listPipeline = asyncPipe(
        this.startSpinner,
        this.getActiveTeam,
        this.getTeamsFromApi,
        this.setTeamsDisplayName,
        this.stopSpinner,
        this.printTeams,
        this.sendAnalytics,
      )

      await listPipeline({ config })
    } catch (err) {
      await this.ux.spinner.stop(`${this.ux.colors.errorRed('Failed')}`)
      this.debug('%O', err)
      this.config.runHook('error', {
        err,
        accessToken: config.tokens.accessToken,
      })
    }
  }
}
