import { ux } from '@cto.ai/sdk'
import Command, { flags } from '~/base'
import { Config } from '~/types'
import { asyncPipe, KEY_REGEX } from '~/utils'
import * as fs from 'fs-extra'
import { AnalyticsError, ValueFileError } from '~/errors/CustomErrors'

export interface ConfigSetInputs {
  config: Config
  key: string
  value: string
  valueFilename: string
}

const { white, reset } = ux.colors

export default class ConfigsSet extends Command {
  static description = 'Add a new config key & value'

  public static flags = {
    key: flags.string({
      char: 'k',
      description: 'the key of the config to set',
    }),
    value: flags.string({
      char: 'v',
      description: 'the value of the config to set',
      exclusive: ['from-file'],
    }),
    'from-file': flags.string({
      char: 'f',
      description: 'path to a file containing the value of the config to set',
      exclusive: ['value'],
    }),
  }

  validateKeyInput = async (input: string): Promise<boolean | string> => {
    if (!input) {
      return `😞 Sorry, the value cannot be empty`
    }
    if (!KEY_REGEX.test(input)) {
      return `😞 Config keys can only contain letters, numbers, underscores, hyphens, and periods`
    }
    return true
  }

  validateValueInput = async (input: string): Promise<boolean | string> => {
    if (!input) {
      return `😞 Sorry, the value cannot be empty`
    }
    return true
  }

  resolveFileConfig = async (
    input: ConfigSetInputs,
  ): Promise<ConfigSetInputs> => {
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

  promptForConfig = async (
    input: ConfigSetInputs,
  ): Promise<ConfigSetInputs> => {
    await ux.print(
      `\n🔑 Add a config for team ${input.config.team.name} ${reset.green(
        '→',
      )}`,
    )

    let key = ''
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
      (await ux.prompt<{ key }>({
        type: 'input',
        name: 'key',
        message: `Enter the name of the config to be stored ${reset.green(
          '→',
        )}`,
        afterMessage: `${reset.white('Config name:')}`,
        validate: this.validateKeyInput,
      })).key

    let value = ''
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
        message: `\nNext add the config's value to be stored ${reset.green(
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

  setConfig = async (inputs: ConfigSetInputs) => {
    try {
      await this.services.api.create(
        `/private/teams/${inputs.config.team.name}/configs`,
        {
          teamConfigs: {
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
      //TODO handle error
    }
  }

  logMessage = (inputs: ConfigSetInputs): ConfigSetInputs => {
    this.log(
      `\n ${white(
        `🙌 Great job! Config ${ux.colors.callOutCyan(
          inputs.key,
        )} has been added to your team ${ux.colors.blueBright(
          inputs.config.team.name,
        )}!`,
      )}`,
    )
    return inputs
  }

  sendAnalytics = async (inputs: ConfigSetInputs) => {
    const {
      team,
      user: { email, username },
    } = inputs.config
    try {
      this.services.analytics.track(
        {
          userId: email,
          teamId: team.id,
          cliEvent: 'Ops CLI Configs:Set',
          event: 'Ops CLI Configs:Set',
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
    } = this.parse(ConfigsSet)

    try {
      const config = await this.isLoggedIn()
      const configSetPipeline = asyncPipe(
        this.resolveFileConfig,
        this.promptForConfig,
        this.setConfig,
        this.sendAnalytics,
        this.logMessage,
      )
      await configSetPipeline({
        config,
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
