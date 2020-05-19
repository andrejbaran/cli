import { ux } from '@cto.ai/sdk'
import Command from '~/base'
import { State } from '~/types'
import { asyncPipe, KEY_REGEX } from '~/utils'
import * as fs from 'fs-extra'
import {
  AnalyticsError,
  SetSecretsProvider,
  NoSecretsProviderFound,
  InvalidSecretVault,
  UserUnauthorized,
  InvalidSecretToken,
  ValueFileError,
} from '~/errors/CustomErrors'
import { flags } from '@oclif/parser'

export interface SetSecretInputs {
  state: State
  key: string
  value: string
  valueFilename: string
}

const { white, reset } = ux.colors

export default class SecretsSet extends Command {
  static description = 'Add a key & value'

  public static flags = {
    key: flags.string({
      char: 'k',
      description: 'the key of the secret to set',
    }),
    value: flags.string({
      char: 'v',
      description: 'the value of the secret to set',
      exclusive: ['from-file'],
    }),
    'from-file': flags.string({
      char: 'f',
      description: 'path to a file containing the value of the secret to set',
      exclusive: ['value'],
    }),
  }

  validateKeyInput = async (input: string): Promise<boolean | string> => {
    if (!input) {
      return `😞 Sorry, the value cannot be empty`
    }
    if (!KEY_REGEX.test(input)) {
      return `😞 Secret keys can only contain letters, numbers, underscores, hyphens, and periods`
    }
    return true
  }

  validateValueInput = async (input: string): Promise<boolean | string> => {
    if (!input) {
      return `😞 Sorry, the value cannot be empty`
    }
    return true
  }

  resolveFileSecret = async (
    input: SetSecretInputs,
  ): Promise<SetSecretInputs> => {
    if (!input.valueFilename) {
      return input
    }

    try {
      const value = await fs.readFile(input.valueFilename, 'utf8')
      return {
        ...input,
        value,
      }
    } catch (err) {
      this.debug('%O', err)
      throw new ValueFileError(err)
    }
  }

  promptForSecret = async (
    input: SetSecretInputs,
  ): Promise<SetSecretInputs> => {
    await ux.print(
      `\n🔑 Add a secret to secret storage for team ${
        input.state.config.team.name
      } ${reset.green('→')}`,
    )

    let key: string = ''
    if (input.key) {
      const keyValidationResult = await this.validateKeyInput(input.key)
      if (keyValidationResult === true) {
        key = input.key
      } else {
        await this.ux.print(keyValidationResult as string)
      }
    }
    key =
      key ||
      (await ux.prompt<{ key: string }>({
        type: 'input',
        name: 'key',
        message: `Enter the name of the secret to be stored ${reset.green(
          '→',
        )}`,
        afterMessage: `${reset.white('Secret name:')}`,
        validate: this.validateKeyInput,
      })).key

    let value: string = ''
    if (input.value) {
      const valueValidationResult = await this.validateValueInput(input.value)
      if (valueValidationResult === true) {
        value = input.value
      } else {
        await this.ux.print(valueValidationResult as string)
      }
    }
    value =
      value ||
      (await ux.prompt<{
        value: string
      }>({
        type: 'editor',
        name: 'value',
        message: `\nNext add the secret's value to be stored ${reset.green(
          '→',
        )}`,
        validate: this.validateValueInput,
        filter: input => input.trimRight(),
      })).value

    return {
      ...input,
      key,
      value,
    }
  }

  setSecret = async (inputs: SetSecretInputs) => {
    try {
      await this.services.api.create(
        `/private/teams/${inputs.state.config.team.name}/secrets`,
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
      switch (err.error[0].code) {
        case 400:
          throw new InvalidSecretVault(err)
        case 401:
          throw new UserUnauthorized(err)
        case 403:
          if (err.error[0].message.includes('invalid secret token')) {
            throw new InvalidSecretToken(err)
          } else {
            throw new NoSecretsProviderFound(err)
          }
        default:
          throw new SetSecretsProvider(err)
      }
    }
  }

  logMessage = (inputs: SetSecretInputs): SetSecretInputs => {
    this.log(
      `\n ${white(
        `🙌 Great job! Secret ${ux.colors.callOutCyan(
          inputs.key,
        )} has been added to your team ${ux.colors.blueBright(
          inputs.state.config.team.name,
        )}!`,
      )}`,
    )
    return inputs
  }

  sendAnalytics = async (inputs: SetSecretInputs) => {
    const { team } = inputs.state.config
    const { email, username } = inputs.state.config.user
    try {
      this.services.analytics.track(
        {
          userId: email,
          teamId: team.id,
          cliEvent: 'Ops CLI Secrets:Set',
          event: 'Ops CLI Secrets:Set',
          properties: {
            email,
            username,
          },
        },
        this.accessToken,
      )
      return inputs
    } catch (err) {
      this.debug('%O', err)
      throw new AnalyticsError(err)
    }
  }

  async run() {
    let {
      flags: { key, value, 'from-file': valueFilename },
    } = this.parse(SecretsSet)

    try {
      this.ux.spinner.start('Initializing')
      await this.isLoggedIn()
      const secretProviderErr = await this.services.secretService.checkForSecretProviderErrors(
        this.services.api,
        this.state.config,
      )
      //@ts-ignore
      this.ux.spinner.stop()
      if (secretProviderErr instanceof Error) {
        throw secretProviderErr
      }

      const switchPipeline = asyncPipe(
        this.resolveFileSecret,
        this.promptForSecret,
        this.setSecret,
        this.sendAnalytics,
        this.logMessage,
      )
      await switchPipeline({
        state: this.state,
        key,
        value,
        valueFilename,
      })
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
