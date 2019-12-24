import Command, { flags } from '~/base'
import { Config, Team } from '~/types'
import { asyncPipe } from '~/utils'
import { ConfigError, APIError } from '~/errors/CustomErrors'
interface displayTeam extends Team {
  displayName: string
}

export interface SwitchInputs {
  activeTeam: Team
  teams: Team[]
  displayTeams: displayTeam[]
  teamSelected: Team
}

export default class TeamSwitch extends Command {
  static description = 'Shows the list of your teams.'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  getActiveTeam = async (): Promise<Pick<SwitchInputs, 'activeTeam'>> => {
    try {
      const { team: activeTeam } = await this.readConfig()
      if (!activeTeam) throw new Error()
      return { activeTeam }
    } catch (err) {
      this.debug('%O', err)
      throw new ConfigError(err)
    }
  }

  getTeamsFromApi = async (inputs: SwitchInputs): Promise<SwitchInputs> => {
    try {
      const { data: teams } = await this.services.api.find('/private/teams', {
        headers: { Authorization: this.accessToken },
      })
      return { ...inputs, teams }
    } catch (err) {
      this.debug('%O', err)
      throw new APIError(err)
    }
  }

  setTeamsDisplayName = (inputs: SwitchInputs): SwitchInputs => {
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

  getSelectedTeamPrompt = async (
    inputs: SwitchInputs,
  ): Promise<SwitchInputs> => {
    this.log("Here's the list of your teams:\n")
    const { displayTeams } = inputs
    const { teamSelected } = await this.ux.prompt<{ teamSelected: Team }>({
      type: 'list',
      name: 'teamSelected',
      message: 'Select a team',
      choices: displayTeams.map(team => {
        return { name: team.displayName, value: team }
      }),
      bottomContent: `\n \n${this.ux.colors.white(
        `Or, run ${this.ux.colors.italic.dim(
          'ops help',
        )} for usage information.`,
      )}`,
    })
    this.log(`\n⏱  Switching teams`)
    return { ...inputs, teamSelected }
  }

  updateActiveTeam = async (inputs: SwitchInputs): Promise<SwitchInputs> => {
    try {
      const {
        teamSelected: { name, id },
      } = inputs
      const configData = await this.readConfig()
      await this.writeConfig(configData, {
        team: { name, id },
      })
    } catch (err) {
      this.debug('%O', err)
      throw new ConfigError(err)
    }

    return inputs
  }

  logMessage = (inputs: SwitchInputs): SwitchInputs => {
    const {
      teamSelected: { name },
    } = inputs
    this.log(
      `\n🚀 Huzzah! ${this.ux.colors.callOutCyan(
        name,
      )} is now the active team.\n`,
    )
    return inputs
  }

  sendAnalytics = (config: Config) => (inputs: SwitchInputs) => {
    const {
      user: { email, username },
    } = config
    const {
      activeTeam: { id: oldTeamId },
      teamSelected: { id: newTeamId },
    } = inputs
    this.services.analytics.track(
      {
        userId: email,
        cliEvent: 'Ops CLI Team:Switch',
        event: 'Ops CLI Team:Switch',
        properties: {
          email,
          username,
          oldTeamId,
          newTeamId,
        },
      },
      this.accessToken,
    )
  }
  startSpinner = async (inputs: SwitchInputs) => {
    await this.ux.spinner.start(
      `🔍 ${this.ux.colors.white('Searching for your teams')}`,
    )
    return inputs
  }
  stopSpinner = async (inputs: SwitchInputs) => {
    await this.ux.spinner.stop(`${this.ux.colors.successGreen('Done')}`)
    return inputs
  }
  async run() {
    await this.parse(TeamSwitch)
    try {
      await this.isLoggedIn()
      const switchPipeline = asyncPipe(
        this.startSpinner,
        this.getActiveTeam,
        this.getTeamsFromApi,
        this.setTeamsDisplayName,
        this.stopSpinner,
        this.getSelectedTeamPrompt,
        this.updateActiveTeam,
        this.logMessage,
        this.sendAnalytics(this.state.config),
      )

      await switchPipeline()
    } catch (err) {
      await this.ux.spinner.stop(`${this.ux.colors.errorRed('Failed')}`)
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
