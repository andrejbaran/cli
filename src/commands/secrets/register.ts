import { ux } from '@cto.ai/sdk'
import Command, { flags } from '~/base'
import { Config, Team } from '~/types'
import { asyncPipe } from '~/utils'
import {ConfigError, APIError, InvalidTeamNameFormat} from '~/errors/CustomErrors'
import {CreateInputs} from "~/commands/team/create";

const { white, reset } = ux.colors
interface displayTeam extends Team {
  displayName: string
}

export interface RegisterInputs {
  activeTeam: Team
  url: string | undefined
  token: string | undefined
}

export default class SecretsRegister extends Command {
  static description = 'Shows the list of your teams.'

  getActiveTeam = async (): Promise<Pick<RegisterInputs, 'activeTeam'>> => {
    try {
      const { team: activeTeam } = await this.readConfig()
      if (!activeTeam) throw new Error()
      return { activeTeam }
    } catch (err) {
      this.debug('%O', err)
      throw new ConfigError(err)
    }
  }

  checkHealth = async (inputs: CreateInputs): Promise<CreateInputs> => {
    try {
      const { name } = inputs
      const res: { data: Team } = await this.services.api.find(
        'health',
        { name },
        // { headers: { Authorization: this.accessToken } },
      )

      console.log("########################################", res)

      const team: Team = { id: res.data.id, name: res.data.name }
      return { ...inputs, team }
    } catch (err) {
      this.debug('%O', err)
      throw new InvalidTeamNameFormat(err)
    }
  }

  promptForSecretsProviderCredentials = async (
    inputs: RegisterInputs,
  ): Promise<RegisterInputs> => {
    const { url } = await ux.prompt<{ url: string }>({
      type: 'input',
      name: 'url',
      message: `\nProvide a URL for your secrets provider ${reset.green(
        '→',
      )}  \n🏀 ${white('URL')} `,
      afterMessage: `${reset.green('✓')} URL    `,
      // TODO: STEVE YOU NEED TO VALIDATE STUFF
      // validate: this.validateTeamName.bind(this),
    })

    const { token } = await ux.prompt<{ token: string }>({
      type: 'input',
      name: 'token',
      message: `\nProvide an access token for your secrets provider ${reset.green(
        '→',
      )}  \n🏀 ${white('TOKEN')} `,
      afterMessage: `${reset.green('✓')} TOKEN    `,
      // TODO: STEVE YOU NEED TO VALIDATE STUFF
      // validate: this.validateTeamName.bind(this),
    })

    return {
      url: url,
      token: token,
    } as RegisterInputs
  }

  registerSecretsProvider = async (
    inputs: RegisterInputs,
  ): Promise<RegisterInputs> => {

    console.log('OVER HERE MAKING BAD ASS REQUESTS')

    return {} as RegisterInputs
  }

  // getTeamsFromApi = async (inputs: SwitchInputs): Promise<SwitchInputs> => {
  //   try {
  //     const { data: teams } = await this.services.api.find('teams', {
  //       headers: { Authorization: this.accessToken },
  //     })
  //     return { ...inputs, teams }
  //   } catch (err) {
  //     this.debug('%O', err)
  //     throw new APIError(err)
  //   }
  // }

  // setTeamsDisplayName = (inputs: SwitchInputs): SwitchInputs => {
  //   const { teams, activeTeam } = inputs
  //   const displayTeams = teams.map(t => {
  //     // If the team is the user's active team, add custom styling to it
  //     if (activeTeam && t.name === activeTeam.name) {
  //       return {
  //         ...t,
  //         displayName: `${blue(t.name)} ${dim('[Active]')}`,
  //       }
  //     }
  //     // If the team isn't the user's active team, simply copy the display name from the team name
  //     return { ...t, displayName: t.name }
  //   })
  //   return { ...inputs, displayTeams }
  // }

  // getSelectedTeamPrompt = async (
  //   inputs: SwitchInputs,
  // ): Promise<SwitchInputs> => {
  //   this.log("Here's the list of your teams:\n")
  //   const { displayTeams } = inputs
  //   const { teamSelected } = await ux.prompt<{ teamSelected: Team }>({
  //     type: 'list',
  //     name: 'teamSelected',
  //     message: 'Select a team',
  //     choices: displayTeams.map(team => {
  //       return { name: team.displayName, value: team }
  //     }),
  //     bottomContent: `\n \n${white(
  //       `Or, run ${italic.dim('ops help')} for usage information.`,
  //     )}`,
  //   })
  //   this.log(`\n⏱  Switching teams`)
  //   return { ...inputs, teamSelected }
  // }

  // updateActiveTeam = async (inputs: SwitchInputs): Promise<SwitchInputs> => {
  //   try {
  //     const {
  //       teamSelected: { name, id },
  //     } = inputs
  //     const configData = await this.readConfig()
  //     await this.writeConfig(configData, {
  //       team: { name, id },
  //     })
  //   } catch (err) {
  //     this.debug('%O', err)
  //     throw new ConfigError(err)
  //   }
  //
  //   return inputs
  // }
  //
  // logMessage = (inputs: SwitchInputs): SwitchInputs => {
  //   const {
  //     teamSelected: { name },
  //   } = inputs
  //   this.log(`\n🚀 Huzzah! ${callOutCyan(name)} is now the active team.\n`)
  //   return inputs
  // }
  //
  // sendAnalytics = (config: Config) => (inputs: SwitchInputs) => {
  //   const {
  //     user: { email, username },
  //   } = config
  //   const {
  //     activeTeam: { id: oldTeamId },
  //     teamSelected: { id: newTeamId },
  //   } = inputs
  //   this.services.analytics.track(
  //     {
  //       userId: email,
  //       cliEvent: 'Ops CLI Team:Switch',
  //       event: 'Ops CLI Team:Switch',
  //       properties: {
  //         email,
  //         username,
  //         oldTeamId,
  //         newTeamId,
  //       },
  //     },
  //     this.accessToken,
  //   )
  // }

  async run() {
    console.log("888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888888 handling secrets like a boss")

    this.parse(SecretsRegister)

    try {
      await this.isLoggedIn()

      console.log("THESE ARE THE INPUTS: ", "some inputs")

      const switchPipeline = asyncPipe(
        this.getActiveTeam,
        this.checkHealth,
        this.promptForSecretsProviderCredentials,
        this.registerSecretsProvider,
        // this.sendAnalytics(this.state.config),
      )
      await switchPipeline()
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
