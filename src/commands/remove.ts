import Command, { flags } from '../base'
import { ux } from '@cto.ai/sdk'
import { asyncPipe } from '~/utils'
import { OPS_REGISTRY_HOST } from '../constants/env'
import {
  APIError,
  CannotDeleteOp,
  NoOpsFound,
  InvalidRemoveOpFormat,
} from '../errors/CustomErrors'
import { ErrorTemplate } from '~/errors/ErrorTemplate'
import { Op, Workflow, RemoveInputs } from '~/types'

export default class Remove extends Command {
  static description = 'Remove an Op from your team.'

  static args = [
    {
      name: 'op',
      description:
        'The name and version of the command or workflow you want to remove. E.g. my-command:0.1.0',
      required: true,
    },
  ]

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  validateOpNameAndVersion = async (
    inputs: Pick<RemoveInputs, 'op' | 'config'>,
  ): Promise<
    Omit<RemoveInputs, 'opOrWorkflow' | 'confirmRemove' | 'deleteDescription'>
  > => {
    let { op } = inputs
    const [opName, opVersion] = op.split(':')

    if (!opName || !opVersion || opName.includes('@') || op.includes('/')) {
      throw new InvalidRemoveOpFormat()
    }
    return { ...inputs, opName, opVersion }
  }

  getApiOpsOrWorkflows = async (
    inputs: RemoveInputs,
  ): Promise<RemoveInputs> => {
    try {
      const {
        opName,
        opVersion,
        config: {
          team: { name: teamName },
          tokens: { accessToken },
        },
      } = inputs
      const {
        data: opOrWorkflow,
      }: { data: Op | Workflow } = await this.services.api
        .find(`teams/${teamName}/ops/${opName}/versions/${opVersion}`, {
          headers: {
            Authorization: accessToken,
          },
        })
        .catch(err => {
          if (err.error[0].code === 404) {
            throw new NoOpsFound(`${opName}:${opVersion}`, teamName)
          }
          throw err
        })

      return { ...inputs, opOrWorkflow }
    } catch (err) {
      if (err instanceof ErrorTemplate) {
        throw err
      }
      this.debug('%O', err)
      throw new APIError(err)
    }
  }

  promptDeleteDescription = async (
    inputs: RemoveInputs,
  ): Promise<RemoveInputs> => {
    const { opOrWorkflow } = inputs
    const { deleteDescription } = await ux.prompt<{
      deleteDescription: string
    }>({
      type: 'input',
      name: 'deleteDescription',
      message: `\nProvide a description for why ${opOrWorkflow.name}:${
        opOrWorkflow.version
      } is being deleted ${ux.colors.reset.green('→')}\n\n ${ux.colors.white(
        'Description:',
      )}`,
      afterMessage: ux.colors.reset.green('✓'),
      validate: input => {
        if (input === '') {
          return 'You need to provide a delete description of your op before continuing'
        }
        if (input.length > 255) {
          return 'Sorry, the maximum length for a delete description is 255 characters'
        }
        return true
      },
    })
    return { ...inputs, deleteDescription }
  }

  confirmRemove = async (inputs: RemoveInputs): Promise<RemoveInputs> => {
    const {
      opOrWorkflow: { name, teamName, version },
    } = inputs
    const { confirmRemove } = await ux.prompt<{
      confirmRemove: boolean
    }>({
      type: 'confirm',
      name: 'confirmRemove',
      suffix: false,
      message: `Are you sure you want to remove @${teamName}/${name}:${version}?`,
    })
    return { ...inputs, confirmRemove }
  }

  removeApiOpOrWorkflow = async (
    inputs: RemoveInputs,
  ): Promise<RemoveInputs> => {
    try {
      if (!inputs.confirmRemove) return inputs
      const {
        opOrWorkflow: { teamName, name, version },
        deleteDescription,
        config: {
          tokens: { accessToken },
        },
      } = inputs
      this.log(`\n 🗑  Removing op ${name}:${version}...`)
      await this.services.api.remove(
        `teams/${teamName}/ops/${name}/versions`,
        version,
        {
          query: { deleteDescription },
          headers: { Authorization: accessToken },
        },
      )
      return inputs
    } catch (err) {
      this.debug('%O', err)
      throw new CannotDeleteOp(err)
    }
  }

  logMessage = (inputs: RemoveInputs): RemoveInputs => {
    const {
      opOrWorkflow: { version, name },
      confirmRemove,
    } = inputs
    if (!confirmRemove) return inputs
    this.log(
      `\n ⚡️ ${ux.colors.bold(
        `${name}:${version}`,
      )} has been ${ux.colors.green('removed')} from the registry!`,
    )

    this.log(
      `\n To publish again run: ${ux.colors.green('$')} ${ux.colors.dim(
        'ops publish <path>',
      )}\n`,
    )
    return inputs
  }

  sendAnalytics = async (inputs: RemoveInputs) => {
    const {
      opOrWorkflow: { id, name, description },
      config: {
        user: { email, username },
        team: { id: teamId },
        tokens: { accessToken },
      },
    } = inputs
    this.services.analytics.track(
      {
        userId: email,
        teamId,
        cliEvent: 'Ops CLI Remove',
        event: 'Ops CLI Remove',
        properties: {
          email,
          username,
          id,
          name,
          description,
          image: `${OPS_REGISTRY_HOST}/${name}`,
        },
      },
      accessToken,
    )
    return inputs
  }

  async run() {
    const {
      args: { op },
    } = this.parse(Remove)
    const { config } = this.state
    try {
      await this.isLoggedIn()

      const removePipeline = asyncPipe(
        this.validateOpNameAndVersion,
        this.getApiOpsOrWorkflows,
        this.promptDeleteDescription,
        this.confirmRemove,
        this.removeApiOpOrWorkflow,
        this.sendAnalytics,
        this.logMessage,
      )
      await removePipeline({ op, config })
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', {
        err,
        accessToken: config.tokens.accessToken,
      })
    }
  }
}
