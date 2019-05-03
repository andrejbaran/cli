import Command, { flags } from '../../base'
import { Team } from '../../types'
import { ux } from '@cto.ai/sdk'

interface displayTeam extends Team {
  displayName: string
}

export default class TeamSwitch extends Command {
  static description = 'Shows the list of your teams.'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  async run() {
    this.log("Here's the list of your teams:\n")

    // Gets the active team from the config
    const configData = await this.readConfig()
    const activeTeam = configData
      ? configData.team
      : {
          id: '',
          name: '',
        }

    // Gets the list of teams from the backend
    const response = await this.api.find('teams', {
      headers: { Authorization: this.accessToken },
    })
    const teams: Team[] = response.data

    // Adds necessary variables (e.g. displaynName) to each team
    const parsedTeams = this._setTeamsDisplayName(teams, activeTeam)

    // Gets the desired team by either the argument or the parsedTeams
    const teamSelected = await this._getSelectedTeamPrompt(parsedTeams)

    // Gets the desired team from the user's input
    const team: displayTeam = parsedTeams.find(
      t => t.name === teamSelected,
    ) || {
      name: '',
      id: '',
      displayName: '',
    }

    // Breaks if there is no matching team
    if (!team || !team.name) {
      this.log(
        `\n❌ There is no team with that name. Please select a different team`,
      )
      process.exit()
    }

    this.log(`\n⏱ Switching teams`)

    // Writes the desired team into the config
    await this.writeConfig(configData, {
      team: { name: team.name, id: team.id },
    })

    this.log(
      `\n🚀 Huzzah! ${ux.colors.callOutCyan(
        team.name,
      )} is now the active team.\n`,
    )
  }

  /**
   * Displays the prompt to the user and returns the selection
   * @param teams The desired teams returned from the database
   * @returns The intended name, which is guaranteed to be unique
   */
  private async _getSelectedTeamPrompt(teams: displayTeam[]): Promise<string> {
    // The prompt to show to the user
    const prompt = {
      type: 'list',
      name: 'teamSelected',
      message: 'Select a team',
      choices: teams.map(team => {
        return { name: team.displayName, value: team.name }
      }),
      bottomContent: `\n \n${ux.colors.white(
        `Or, run ${ux.colors.italic.dim('ops help')} for usage information.`,
      )}`,
    }

    // Destructures and returns the desired input from the user
    const { teamSelected } = await ux.prompt(prompt)
    return teamSelected
  }

  /**
   * Assigns a display name to the teams. Desired teams will have custom styling
   * @param teams The teams that the user has access to
   * @param activeTeam The team that is currently active
   */
  private _setTeamsDisplayName(teams: Team[], activeTeam: Team): displayTeam[] {
    return teams.map(t => {
      // If the team is the user's active team, add custom styling to it
      if (activeTeam && t.name === activeTeam.name) {
        return {
          ...t,
          displayName: `${ux.colors.blue(t.name)} ${ux.colors.dim('[Active]')}`,
        }
      }
      // If the team isn't the user's active team, simply copy the display name from the team name
      return { ...t, displayName: t.name }
    })
  }
}
