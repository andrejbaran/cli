import { ux } from '@cto.ai/sdk'
import Command from '~/base'
import { Team, State } from '~/types'
import { asyncPipe } from '~/utils'
import {
  ConfigError,
  InvalidTeamNameFormat,
  RegisterSecretsProvider,
} from '~/errors/CustomErrors'

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
  static description = 'Register a secrets provider for a team'

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

  promptForSecretsProviderCredentials = async (
    inputs: RegisterInputs,
  ): Promise<RegisterInputs> => {
    const { url, token } = await ux.prompt<{ url: string; token: string }>([
      {
        type: 'input',
        name: 'url',
        message: `\n🔐 Register your secret storage to share secrets and passwords with team ${reset.blueBright(
          `${inputs.activeTeam.name}`,
        )}    \n${reset.grey('Enter your secret storage')} ${reset.blue(
          'url',
        )} ${reset.grey('and')} ${reset.blue('access token')} ${reset.grey(
          '. Change the team to with which \nthe secret storage will be registered by running',
        )} ${reset.blue('ops team:switch')}${reset.grey('.')} \n${white(
          'Link your secret storage to your team',
        )} ${reset.green('→')}`,
        afterMessage: `${reset.green('✓')} URL    `,
        validate: this.validateRegisterInput.bind(this),
      },
      {
        type: 'password',
        name: 'token',
        message: `\n🔐 Register secret storage access token ${reset.green(
          '→',
        )}  \n${white('Enter access token:')} `,
        afterMessage: `${reset.green('✓')} TOKEN ${reset.grey(
          '********',
        )}    \n🙌 Secrets registration complete!`,
        validate: this.validateRegisterInput.bind(this),
      },
    ])

    return { ...inputs, url, token }
  }

  registerSecretsProvider = async (inputs: RegisterInputs) => {
    try {
      const { data: response } = await this.services.api.create(
        `teams/${inputs.activeTeam.name}/secrets/register`,
        {
          write_privilege: true,
          token: inputs.token,
          url: inputs.url,
        },
        {
          headers: {
            Authorization: this.accessToken,
          },
        },
      )

      return inputs
    } catch (err) {
      this.debug('%O', err)
      throw new RegisterSecretsProvider(err)
    }
  }

  sendAnalytics = (state: State) => async () => {
    const { team } = state.config
    const { email, username } = state.config.user

    this.services.analytics.track(
      {
        userId: email,
        teamId: team.id,
        cliEvent: 'Ops CLI Register Secrets Provider',
        event: 'Ops CLI Register Secrets Provider',
        properties: {
          email,
          username,
        },
      },
      this.accessToken,
    )
  }

  async run() {
    try {
      await this.isLoggedIn()

      const switchPipeline = asyncPipe(
        this.getActiveTeam,
        this.promptForSecretsProviderCredentials,
        this.registerSecretsProvider,
        this.sendAnalytics(this.state),
      )
      await switchPipeline()
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
