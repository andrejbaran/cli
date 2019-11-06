import { ux } from '@cto.ai/sdk'
import Command, { flags } from '~/base'
import {Config, Team, User} from '~/types'
import {asyncPipe, validCharsTeamName} from '~/utils'
import {ConfigError, APIError, InvalidTeamNameFormat} from '~/errors/CustomErrors'
import {CreateInputs} from "~/commands/team/create";
import {RemoveInputs} from "~/commands/remove";

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

  validateRegisterInput = async (input: string): Promise<boolean | string> => {
    try {
      if (!input) {
        return `😞 Sorry, the value cannot be empty`
      }
      return true
    } catch (err) {
      throw new InvalidTeamNameFormat(err)
    }
  }
//🔗
  promptForSecretsProviderCredentials = async (
    inputs: RegisterInputs,
  ): Promise<RegisterInputs> => {
    const { url } = await ux.prompt<{ url: string }>({
      type: 'input',
      name: 'url',
      message: `\n🔐 Register your secret storage to share secrets and passwords with team ${reset.blueBright(`${inputs.activeTeam.name}`)}    \n${reset.grey('Enter your secret storage')} ${reset.blue('url')} ${reset.grey('and')} ${reset.blue('access token')} ${reset.grey('. Change the team to with which \nthe secret storage will be registered by running')} ${reset.blue('ops team:switch')}${reset.grey('.')} \n${white('Link your secret storage to your team')} ${reset.green(
        '→',
      )}`,
      afterMessage: `${reset.green('✓')} URL    `,
      validate: this.validateRegisterInput.bind(this),
    })

    const { token } = await ux.prompt<{ token: string }>({
      type: 'input',
      name: 'token',
      message: `\n🔐 Register secret storage access token ${reset.green(
        '→',
      )}  \n${white('Enter access token:')} `,
      afterMessage: `${reset.green('✓')} TOKEN    `,
      validate: this.validateRegisterInput.bind(this),
    })

    return {
      activeTeam: inputs.activeTeam,
      url: url,
      token: token,
    } as RegisterInputs
  }

  registerSecretsProvider = async (
    inputs: RegisterInputs,
  ): Promise<RegisterInputs> => {
    try {
      const { data: response } = await this.services.api.create(`teams/${inputs.activeTeam.name}/secrets/register`,
        {
          write_privilege: true,
          token:          inputs.token,
          url:            inputs.url,
        },
        {
          headers: {
            Authorization: this.accessToken,
          },
      });

      return inputs
    } catch (err) {
      this.debug('%O', err)
      throw new APIError(err)
    }
  }

  sendAnalytics = (user: User) => async (inputs: RemoveInputs) => {
    const { email, username } = user
    this.services.analytics.track(
      {
        userId: email,
        teamId: this.team.id,
        cliEvent: 'Ops CLI Register Secrets Provider',
        event: 'Ops CLI Register Secrets Provider',
        properties: {
          email,
          username,
        },
      },
      this.accessToken,
    )
    return inputs
  }

  async run() {
    this.parse(SecretsRegister)

    try {
      await this.isLoggedIn()

      const switchPipeline = asyncPipe(
        this.getActiveTeam,
        this.promptForSecretsProviderCredentials,
        this.registerSecretsProvider,
        this.sendAnalytics(this.user)
      )
      await switchPipeline()
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
