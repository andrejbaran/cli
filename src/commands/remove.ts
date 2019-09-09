import Command, { flags } from '../base'
import { ux } from '@cto.ai/sdk'
import { asyncPipe } from '~/utils'
import { OPS_REGISTRY_HOST } from '../constants/env'
import { APIError, NoResultsFoundForDeletion } from '../errors/CustomErrors'
import { Op, Workflow, User } from '~/types'
import { WORKFLOW, OP } from '~/constants/opConfig'

export interface RemoveInputs {
  filter: string
  removeType: string
  apiResults: (Op | Workflow)[]
  opOrWorkflow: Op | Workflow
  confirmRemove: boolean
}

export default class Remove extends Command {
  static description = 'Remove an op from a team.'

  static args = [
    {
      name: 'filter',
      description:
        'A part of the name or description of the op or workflow you want to remove.',
    },
  ]

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  removeTypePrompt = async (
    filter: string,
  ): Promise<Pick<RemoveInputs, 'filter' | 'removeType'>> => {
    const { removeType } = await this.ux.prompt<{ removeType: string }>({
      type: 'list',
      name: 'removeType',
      message: `Start by selecting either private ${this.ux.colors.multiBlue(
        'Op',
      )} or ${this.ux.colors.multiOrange(
        'Workflow',
      )} to remove  ${this.ux.colors.reset.green('→')}`,
      choices: [
        { name: `${this.ux.colors.multiBlue('\u2022')} Op`, value: OP },
        {
          name: `${this.ux.colors.multiOrange('\u2022')} Workflow`,
          value: WORKFLOW,
        },
      ],
    })
    return { filter, removeType }
  }

  promptFilter = async (inputs: RemoveInputs): Promise<RemoveInputs> => {
    let { filter, removeType } = inputs
    if (!filter) {
      const answers = await ux.prompt<{ filter: string }>({
        type: 'input',
        name: 'filter',
        message: `\n Please type in the name or description of the private ${removeType} you want to remove ${ux.colors.reset.green(
          '→',
        )}\n ${ux.colors.reset(
          ux.colors.secondary(
            `Leave blank to list all private ${removeType} you can remove`,
          ),
        )} \n\n 🗑  ${ux.colors.reset.white('Name or Description')}`,
      })
      filter = answers.filter
    }
    return { ...inputs, filter }
  }

  getApiOpsOrWorkflows = async (
    inputs: RemoveInputs,
  ): Promise<RemoveInputs> => {
    try {
      const { filter, removeType } = inputs
      let query = {}
      if (removeType === OP) {
        query = { team_id: this.team.id }
      } else {
        query = { teamId: this.team.id }
      }
      if (filter.length) Object.assign(query, { search: filter })
      const {
        data: apiResults,
      }: { data: (Op | Workflow)[] } = await this.services.api.find(
        `${removeType}s`,
        {
          query,
          headers: {
            Authorization: this.accessToken,
          },
        },
      )

      return { ...inputs, apiResults }
    } catch (err) {
      this.debug('%O', err)
      throw new APIError(err)
    }
  }

  filterResultsByTeam = (inputs: RemoveInputs): RemoveInputs => {
    let { apiResults, removeType } = inputs
    apiResults = apiResults.filter(opOrWorkflow => {
      return opOrWorkflow.teamID === this.team.id
    })

    if (!apiResults.length) {
      throw new NoResultsFoundForDeletion(removeType)
    }
    return { ...inputs, apiResults }
  }

  selectOpOrWorkflow = async (inputs: RemoveInputs): Promise<RemoveInputs> => {
    const { apiResults, removeType } = inputs
    let opOrWorkflow: Op | Workflow
    if (apiResults.length === 1) {
      opOrWorkflow = apiResults[0]
    } else {
      const { selected } = await ux.prompt<{
        selected: Op | Workflow
      }>({
        type: 'list',
        name: 'selected',
        pageSize: 100,
        message: `\n 🗑  Which private ${removeType} would you like to remove?`,
        choices: apiResults.map(l => {
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
      opOrWorkflow: { name },
    } = inputs
    const { confirmRemove } = await ux.prompt<{
      confirmRemove: boolean
    }>({
      type: 'confirm',
      name: 'confirmRemove',
      message: `Are you sure you want to remove ${name}?`,
    })
    return { ...inputs, confirmRemove }
  }

  removeApiOpOrWorkflow = async (
    inputs: RemoveInputs,
  ): Promise<RemoveInputs> => {
    try {
      if (!inputs.confirmRemove) return inputs
      const {
        opOrWorkflow: { id },
        removeType,
      } = inputs
      this.log('\n 🗑  Removing from registry...')

      await this.services.api.remove(`${removeType}s`, id, {
        headers: { Authorization: this.accessToken },
      })
      return inputs
    } catch (err) {
      this.debug('%O', err)
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
      removeType,
    } = inputs
    this.services.analytics.track(
      {
        userId: email,
        event: 'Ops CLI Remove',
        properties: {
          email,
          username,
          type: removeType,
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
      args: { filter },
    } = this.parse(Remove)
    try {
      await this.isLoggedIn()
      const removePipeline = asyncPipe(
        this.removeTypePrompt,
        this.promptFilter,
        this.getApiOpsOrWorkflows,
        this.filterResultsByTeam,
        this.selectOpOrWorkflow,
        this.confirmRemove,
        this.removeApiOpOrWorkflow,
        this.logMessage,
        this.sendAnalytics(this.user),
      )
      await removePipeline(filter)
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
