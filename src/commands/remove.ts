import Command, { flags } from '../base'
import { ux } from '@cto.ai/sdk'
import { asyncPipe, titleCase } from '~/utils'
import { OPS_REGISTRY_HOST } from '../constants/env'
import {
  APIError,
  NoResultsFoundForDeletion,
  CannotDeleteOps,
  NoOpsFound,
} from '../errors/CustomErrors'
import { Op, Workflow, User } from '~/types'
import {
  WORKFLOW,
  COMMAND,
  getEndpointFromOpType,
  OpTypes,
} from '~/constants/opConfig'

export interface RemoveInputs {
  opName: string
  removeType: OpTypes
  apiOps: (Op | Workflow)[]
  opOrWorkflow: Op | Workflow
  confirmRemove: boolean
}

export default class Remove extends Command {
  static description = 'Remove an op from a team.'

  static args = [
    {
      name: 'opName',
      description:
        'A part of the name or description of the command or workflow you want to remove.',
    },
  ]

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  // removeTypePrompt = async (
  //   opName: string,
  // ): Promise<Pick<RemoveInputs, 'opName' | 'removeType'>> => {
  //   const { removeType } = await this.ux.prompt<{ removeType: OpTypes }>({
  //     type: 'list',
  //     name: 'removeType',
  //     message: `Start by selecting either private ${this.ux.colors.multiBlue(
  //       titleCase(COMMAND),
  //     )} or ${this.ux.colors.multiOrange(
  //       titleCase(WORKFLOW),
  //     )} to remove  ${this.ux.colors.reset.green('→')}`,
  //     choices: [
  //       {
  //         name: `${this.ux.colors.multiBlue('\u2022')} ${titleCase(COMMAND)}`,
  //         value: COMMAND,
  //       },
  //       {
  //         name: `${this.ux.colors.multiOrange('\u2022')} ${titleCase(
  //           WORKFLOW,
  //         )}`,
  //         value: WORKFLOW,
  //       },
  //     ],
  //   })
  //   return { opName, removeType }
  // }

  promptFilter = async (
    opName: string,
  ): Promise<Pick<RemoveInputs, 'opName'>> => {
    if (!opName) {
      const answers = await ux.prompt<{ opName: string }>({
        type: 'input',
        name: 'opName',
        message: `\n Please type in the name of the private op you want to remove ${ux.colors.reset.green(
          '→',
        )}\n ${ux.colors.reset(
          ux.colors.secondary(
            `Leave blank to list all private ops you can remove`,
          ),
        )} \n\n 🗑  ${ux.colors.reset.white('Name or Description')}`,
      })
      opName = answers.opName
    }
    return { opName }
  }

  getApiOpsOrWorkflows = async (
    inputs: RemoveInputs,
  ): Promise<RemoveInputs> => {
    const { opName } = inputs
    let apiOps: (Op | Workflow)[]

    if (!opName) {
      try {
        ;({ data: apiOps } = await this.services.api.find(
          `teams/${this.state.config.team.name}/ops`,
          {
            headers: {
              Authorization: this.accessToken,
            },
          },
        ))
      } catch (err) {
        this.debug('%O', err)
        throw new APIError(err)
      }
    } else {
      let apiOp: Op | Workflow
      try {
        ;({ data: apiOp } = await this.services.api.find(
          `teams/${this.state.config.team.name}/ops/${opName}`,
          {
            headers: {
              Authorization: this.accessToken,
            },
          },
        ))
      } catch (err) {
        this.debug('%O', err)
        throw new APIError(err)
      }
      if (!apiOp) {
        throw new NoOpsFound(opName)
      }
      apiOps = [apiOp]
    }

    return { ...inputs, apiOps }
  }

  selectOpOrWorkflow = async (inputs: RemoveInputs): Promise<RemoveInputs> => {
    const { apiOps, removeType } = inputs
    let opOrWorkflow: Op | Workflow

    if (!apiOps || !apiOps.length) {
      throw new NoResultsFoundForDeletion(inputs.opName)
    }

    if (apiOps.length === 1) {
      opOrWorkflow = apiOps[0]
    } else {
      const { selected } = await ux.prompt<{
        selected: Op | Workflow
      }>({
        type: 'list',
        name: 'selected',
        pageSize: 100,
        message: `\n 🗑  Which private op would you like to remove?`,
        choices: apiOps.map(l => {
          return {
            name: `${ux.colors.callOutCyan(l.name)} ${ux.colors.white(
              l.description,
            )} | id: ${ux.colors.white(l.id.toLowerCase())}`,
            value: l,
          }
        }),
      })
      opOrWorkflow = selected
    }
    return { ...inputs, opOrWorkflow }
  }

  confirmRemove = async (inputs: RemoveInputs): Promise<RemoveInputs> => {
    const {
      opOrWorkflow: { name, teamName },
    } = inputs
    const { confirmRemove } = await ux.prompt<{
      confirmRemove: boolean
    }>({
      type: 'confirm',
      name: 'confirmRemove',
      suffix: false,
      message: `Are you sure you want to remove @${teamName}/${name}?`,
    })
    return { ...inputs, confirmRemove }
  }

  removeApiOpOrWorkflow = async (
    inputs: RemoveInputs,
  ): Promise<RemoveInputs> => {
    try {
      if (!inputs.confirmRemove) return inputs
      const {
        opOrWorkflow: { id, type },
        // removeType,
      } = inputs
      this.log('\n 🗑  Removing from registry...')

      await this.services.api.remove(getEndpointFromOpType(type), id, {
        headers: { Authorization: this.accessToken },
      })
      return inputs
    } catch (err) {
      this.debug('%O', err)
      if (err.error[0].code === 5029) {
        throw new CannotDeleteOps(err)
      }
      throw new APIError(err)
    }
  }

  logMessage = (inputs: RemoveInputs): RemoveInputs => {
    const {
      opOrWorkflow: { id, name },
      confirmRemove,
    } = inputs
    if (!confirmRemove) return inputs
    this.log(
      `\n ⚡️ ${ux.colors.bold(`${name}:${id}`)} has been ${ux.colors.green(
        'removed',
      )} from the registry!`,
    )

    this.log(
      `\n To publish again run: ${ux.colors.green('$')} ${ux.colors.dim(
        'ops publish <path>',
      )}\n`,
    )
    return inputs
  }

  sendAnalytics = (user: User) => (inputs: RemoveInputs) => {
    const { email, username } = user
    const {
      opOrWorkflow: { id, name, description },
      // removeType,
    } = inputs
    this.services.analytics.track(
      {
        userId: email,
        event: 'Ops CLI Remove',
        properties: {
          email,
          username,
          // type: removeType,
          id,
          name,
          description,
          image: `${OPS_REGISTRY_HOST}/${name}`,
        },
      },
      this.accessToken,
    )
  }

  async run() {
    const {
      args: { opName },
    } = this.parse(Remove)

    try {
      await this.isLoggedIn()

      const removePipeline = asyncPipe(
        // this.removeTypePrompt,
        this.promptFilter,
        this.getApiOpsOrWorkflows,
        this.selectOpOrWorkflow,
        this.confirmRemove,
        this.removeApiOpOrWorkflow,
        this.logMessage,
        this.sendAnalytics(this.user),
      )
      await removePipeline(opName)
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
