import { ux } from '@cto.ai/sdk'
import Command, { flags } from '~/base'
import { User, Team } from '~/types'
import { asyncPipe } from '~/utils'
import { ReadConfigError, APIError } from '~/errors/CustomErrors'

const { white, italic, blue, dim, callOutCyan } = ux.colors
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
      this.debug('%0', err)
      throw new ReadConfigError(err)
    }
  }

  getTeamsFromApi = async (inputs: SwitchInputs): Promise<SwitchInputs> => {
    try {
      const { data: teams } = await this.api.find('teams', {
        headers: { Authorization: this.accessToken },
      })
      return { ...inputs, teams }
    } catch (err) {
      this.debug('%0')
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
          displayName: `${blue(t.name)} ${dim('[Active]')}`,
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
    const { teamSelected } = await ux.prompt<{ teamSelected: Team }>({
      type: 'list',
      name: 'teamSelected',
      message: 'Select a team',
      choices: displayTeams.map(team => {
        return { name: team.displayName, value: team }
      }),
      bottomContent: `\n \n${white(
        `Or, run ${italic.dim('ops help')} for usage information.`,
      )}`,
    })
    this.log(`\n⏱ Switching teams`)
    return { ...inputs, teamSelected }
  }

  updateActiveTeam = async (inputs: SwitchInputs): Promise<SwitchInputs> => {
    const {
      teamSelected: { name, id },
    } = inputs
    const configData = await this.readConfig()
    await this.writeConfig(configData, {
      team: { name, id },
    })
    return inputs
  }

  logMessage = (inputs: SwitchInputs): SwitchInputs => {
    const {
      teamSelected: { name },
    } = inputs
    this.log(`\n🚀 Huzzah! ${callOutCyan(name)} is now the active team.\n`)
    return inputs
  }

  sendAnalytics = (user: User) => (inputs: SwitchInputs) => {
    const { email, username } = user
    const { activeTeam, teamSelected } = inputs
    this.analytics.track({
      userId: email,
      event: 'Ops CLI Team:Switch',
      properties: {
        email,
        username,
        oldTeam: activeTeam,
        newTeam: teamSelected,
      },
    })
  }

  async run() {
    this.isLoggedIn()

    try {
      const switchPipeline = asyncPipe(
        this.getActiveTeam,
        this.getTeamsFromApi,
        this.setTeamsDisplayName,
        this.getSelectedTeamPrompt,
        this.updateActiveTeam,
        this.sendAnalytics(this.user),
      )
      await switchPipeline()
    } catch (err) {
      this.debug('%0', err)
    }
  }
}
