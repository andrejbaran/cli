import { ux } from '@cto.ai/sdk'
import Command from '~/base'
import { Team, Config } from '~/types'
import { asyncPipe, terminalText } from '~/utils'
import {
  InvalidTeamNameFormat,
  RegisterSecretsProvider,
  NoTeamFound,
  UserUnauthorized,
  InvalidSecretToken,
  InvalidSecretVault,
} from '~/errors/CustomErrors'

const { white, reset } = ux.colors

export interface RegisterInputs {
  config: Config
  url: string | undefined
  token: string | undefined
}

export default class SecretsRegister extends Command {
  static description = 'Register a secrets provider for a team'

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
          `${inputs.config.team.name}`,
        )}    \n${reset.grey('Enter your secret storage')} ${reset.blue(
          'url',
        )} ${reset.grey('and')} ${reset.blue('access token.')}\n${reset.grey(
          `Run ${terminalText('ops team:switch')}`,
        )} ${reset.grey('to change the team for')} ${reset.grey(
          'the secret storage registration.',
        )}\n${white('Link your secret storage to your team')} ${reset.green(
          '→',
        )}`,
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
      await this.services.api.create(
        `/private/teams/${inputs.config.team.name}/secrets/register`,
        {
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

      switch (err.error[0].code) {
        case 400:
          throw new InvalidSecretVault(err)
        case 401:
          throw new UserUnauthorized(err)
        case 403:
          throw new InvalidSecretToken(err)
        case 404:
          throw new NoTeamFound(inputs.config.team.name)
        default:
          throw new RegisterSecretsProvider(err)
      }
    }
  }

  sendAnalytics = async (inputs: RegisterInputs) => {
    const { config } = inputs
    this.services.analytics.track(
      'Ops CLI Secrets:Register',
      {
        username: config.user.username,
      },
      config,
    )
  }

  async run() {
    const config = await this.isLoggedIn()
    try {
      const switchPipeline = asyncPipe(
        this.promptForSecretsProviderCredentials,
        this.registerSecretsProvider,
        this.sendAnalytics,
      )
      await switchPipeline(config)
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', {
        err,
        accessToken: config.tokens.accessToken,
      })
    }
  }
}
