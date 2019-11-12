import { ux } from '@cto.ai/sdk'
import Command from '~/base'
import { State } from '~/types'
import { asyncPipe } from '~/utils'
import {
  SetSecretsProvider,
  SecretsValuesNotEqual,
  SecretsFlagsRequired,
} from '~/errors/CustomErrors'
import { flags } from '@oclif/parser'

export interface SetSecretInputs {
  state: State
  key: string
  value: string
}

const { white, reset } = ux.colors

export default class SecretsSet extends Command {
  static description = 'Add a key & value'

  public static flags = {
    key: flags.string({ char: 'k' }),
    value: flags.string({ char: 'v' }),
  }

  validateRegisterInput = async (input: string): Promise<boolean | string> => {
    if (!input) {
      return `😞 Sorry, the value cannot be empty`
    }
    return true
  }

  promptForSecret = async (
    input: SetSecretInputs,
  ): Promise<SetSecretInputs> => {
    if (input.key && input.value) {
      return input
    }

    await ux.print(
      `\n🔑 Add a secret to secret storage for team ${
        input.state.config.team.name
      } ${reset.green('→')}`,
    )

    const { key, valueOriginal, valueConfirm } = await ux.prompt<{
      key: string
      valueOriginal: string
      valueConfirm: string
    }>([
      {
        type: 'input',
        name: 'key',
        message: `Enter the name of the secret to be stored ${reset.green(
          '→',
        )}`,
        afterMessage: `${reset.white('Secret name:')}`,
        validate: this.validateRegisterInput.bind(this),
      },
      {
        type: 'input',
        name: 'valueOriginal',
        message: `\nNext add the secret's value to be stored ${reset.green(
          '→',
        )}`,
        validate: this.validateRegisterInput.bind(this),
      },
      {
        type: 'input',
        name: 'valueConfirm',
        message: `\nPlease confirm the secret's value to be stored ${reset.green(
          '→',
        )}`,
        validate: this.validateRegisterInput.bind(this),
      },
    ])

    if (valueOriginal !== valueConfirm) {
      throw new SecretsValuesNotEqual()
    }

    return {
      key: key,
      value: valueOriginal,
      state: input.state,
    }
  }

  setSecret = async (inputs: SetSecretInputs) => {
    try {
      await this.services.api.create(
        `teams/${inputs.state.config.team.name}/secrets`,
        {
          secrets: {
            [inputs.key]: inputs.value,
          },
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
      throw new SetSecretsProvider(err)
    }
  }

  sendAnalytics = (inputs: SetSecretInputs) => async () => {
    const { team } = inputs.state.config
    const { email, username } = inputs.state.config.user

    this.services.analytics.track(
      {
        userId: email,
        teamId: team.id,
        cliEvent: 'Ops CLI Set Secrets',
        event: 'Ops CLI Set Secrets',
        properties: {
          email,
          username,
        },
      },
      this.accessToken,
    )
  }

  validateFlags = (k: string | undefined, v: string | undefined) => {
    if ((k && !v) || (v && !k)) {
      throw new SecretsFlagsRequired()
    }
  }

  async run() {
    let {
      flags: { key, value },
    } = this.parse(SecretsSet)

    try {
      await this.isLoggedIn()

      this.validateFlags(key, value)

      const switchPipeline = asyncPipe(
        this.promptForSecret,
        this.setSecret,
        this.sendAnalytics,
      )
      await switchPipeline({
        state: this.state,
        key,
        value,
      })
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
