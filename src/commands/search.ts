import fuzzy from 'fuzzy'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as yaml from 'yaml'
import Command, { flags } from '../base'
import {
  Answers,
  SourceResult,
  Op,
  Fuzzy,
  Workflow,
  OpsYml,
  OpsFindQuery,
  WorkflowsFindQuery,
  OpsFindResponse,
  WorkflowsFindResponse,
} from '../types'
import { asyncPipe } from '../utils/asyncPipe'
import { AnalyticsError, APIError } from '../errors/CustomErrors'
import { OP_FILE, PUBLIC, PRIVATE, LOCAL } from '../constants/opConfig'

interface SearchInputs {
  filter: string
  searchTypes: string[]
  apiOps: Op[]
  apiWorkflows: Workflow[]
  localWorkflows: Workflow[]
  selectedOpOrWorkflow: Op | Workflow
}

export default class Search extends Command {
  static description = 'Search for ops in your workspaces.'

  static args = [
    {
      name: 'filter',
      description:
        'Filters op results which include filter text in op name or description.',
    },
  ]
  static flags = {
    help: flags.help({ char: 'h' }),
  }

  opsAndWorkflows: (Op | Workflow)[] = []

  searchTypePrompt = async (
    filter: string,
  ): Promise<Pick<SearchInputs, 'filter' | 'searchTypes'>> => {
    const choices = [PUBLIC, PRIVATE, LOCAL]
    const { searchTypes } = await this.ux.prompt<{ searchTypes: string[] }>({
      type: 'checkbox',
      name: 'searchTypes',
      message: `Start by selecting the types of ${this.ux.colors.multiBlue(
        'Ops',
      )} or ${this.ux.colors.multiOrange(
        'Workflows',
      )} to search ${this.ux.colors.reset.green('→')}\n`,
      choices,
      default: choices,
      validate: input => {
        return input.length > 0
      },
    })
    return { filter, searchTypes }
  }

  showSearchMessage = (
    inputs: Pick<SearchInputs, 'searchTypes' | 'filter'>,
  ): Pick<SearchInputs, 'searchTypes' | 'filter'> => {
    const { filter, searchTypes } = inputs
    const workspaceText = searchTypes.length > 1 ? 'workspaces' : 'workspace'
    const searchText = `Searching ${searchTypes
      .join(', ')
      .replace(/,(?!.*,)/gim, ' and')} ${workspaceText} for`
    this.log(
      `\n🔍 ${this.ux.colors.white(searchText)} ${this.ux.colors.callOutCyan(
        filter || 'all ops and workflows',
      )}.`,
    )
    return inputs
  }

  getApiOps = async (inputs: SearchInputs): Promise<SearchInputs> => {
    try {
      const { filter } = inputs
      const query: OpsFindQuery = filter
        ? { search: filter, team_id: this.team.id }
        : { team_id: this.team.id }

      const findResponse: OpsFindResponse = await this.services.api.find(
        'ops',
        {
          query,
          headers: {
            Authorization: this.accessToken,
          },
        },
      )

      const { data: apiOps } = findResponse
      return { apiOps, ...inputs }
    } catch (err) {
      this.debug('error: %O', err)
      throw new APIError(err)
    }
  }

  filterApiOps = (inputs: SearchInputs): SearchInputs => {
    let { searchTypes, apiOps = [] } = inputs

    if (!searchTypes.includes(PUBLIC)) {
      apiOps = apiOps.filter(apiOp => {
        return apiOp.teamID === this.team.id
      })
    }
    if (!searchTypes.includes(PRIVATE)) {
      apiOps = apiOps.filter(apiOp => {
        return apiOp.teamID !== this.team.id
      })
    }

    return { ...inputs, apiOps }
  }

  getApiWorkflows = async (inputs: SearchInputs): Promise<SearchInputs> => {
    try {
      const { filter } = inputs
      const query: WorkflowsFindQuery = filter
        ? { search: filter, teamId: this.team.id }
        : { teamId: this.team.id }

      const findResponse: WorkflowsFindResponse = await this.services.api.find(
        'workflows',
        {
          query,
          headers: {
            Authorization: this.accessToken,
          },
        },
      )

      const { data: apiWorkflows } = findResponse
      return { apiWorkflows, ...inputs }
    } catch (err) {
      this.debug(`error: %O`, err.error)
      throw new APIError(err)
    }
  }

  filterApiWorkflows = (inputs): SearchInputs => {
    let { searchTypes, apiWorkflows } = inputs
    if (!searchTypes.includes(PUBLIC)) {
      apiWorkflows = apiWorkflows.filter(apiWorkflow => {
        return apiWorkflow.teamID === this.team.id
      })
    }
    if (!searchTypes.includes(PRIVATE)) {
      apiWorkflows = apiWorkflows.filter(apiWorkflow => {
        return apiWorkflow.teamID !== this.team.id
      })
    }
    apiWorkflows
    return { ...inputs, apiWorkflows }
  }

  getLocalWorkflows = async (inputs: SearchInputs): Promise<SearchInputs> => {
    const localWorkflows = []
    try {
      const { searchTypes } = inputs
      if (!searchTypes.includes(LOCAL)) return { ...inputs, localWorkflows }

      const manifest = await fs.readFile(
        path.join(process.cwd(), OP_FILE),
        'utf8',
      )
      if (!manifest) return inputs

      const { workflows = [] }: OpsYml = yaml.parse(manifest)

      workflows.forEach(workflow => (workflow.local = true))
      return { ...inputs, localWorkflows: workflows }
    } catch {
      return { ...inputs, localWorkflows }
    }
  }

  _removeIfNameOrDescriptionDontContainQuery = (filter: string) => (
    workflow: Workflow,
  ): boolean => {
    return (
      workflow.name.includes(filter) || workflow.description.includes(filter)
    )
  }

  filterLocalWorkflows = (inputs: SearchInputs) => {
    let { localWorkflows, filter } = inputs
    if (!localWorkflows.length) return inputs

    localWorkflows = localWorkflows.filter(
      this._removeIfNameOrDescriptionDontContainQuery(filter),
    )

    return { ...inputs, localWorkflows }
  }
  _removeIfLocalExists = (workflows: Workflow[]) => (apiOp: Op) => {
    const match = workflows.find(workflow => workflow.name === apiOp.name)
    return !match
  }

  resolveLocalAndApi = (inputs: SearchInputs) => {
    const { apiOps, localWorkflows, apiWorkflows } = inputs
    const ops = apiOps.filter(this._removeIfLocalExists(localWorkflows))
    this.opsAndWorkflows = [...ops, ...localWorkflows, ...apiWorkflows].sort(
      (a, b) => {
        if (a.name < b.name) return -1
        if (b.name < a.name) return 1
        return 0
      },
    )
    return inputs
  }

  checkData = async (inputs: SearchInputs) => {
    if (!this.opsAndWorkflows.length) {
      this.log(
        `\n 😞 No ops found in your team, public or local workspaces. Try again or run ${this.ux.colors.callOutCyan(
          'ops publish',
        )} to create an op. \n`,
      )
    }
    return inputs
  }

  selectOpOrWorkflowPrompt = async (
    inputs: SearchInputs,
  ): Promise<SearchInputs> => {
    const { selectedOpOrWorkflow } = await this.ux.prompt<{
      selectedOpOrWorkflow: Op | Workflow
    }>({
      type: 'autocomplete',
      name: 'selectedOpOrWorkflow',
      pageSize: 5,
      message: `\nSelect a ${this.ux.colors.multiBlue(
        '\u2022Op',
      )} or ${this.ux.colors.multiOrange(
        '\u2022Workflow',
      )} to run ${this.ux.colors.reset.green('→')}\n${this.ux.colors.reset.dim(
        '🌎 = Public 🔑 = Private 🖥  = Local  🔍 Search:',
      )} `,
      source: this._autocompleteSearch.bind(this),
      bottomContent: `\n \n${this.ux.colors.white(
        `Or, run ${this.ux.colors.callOutCyan(
          'ops help',
        )} for usage information.`,
      )}`,
    })
    return { ...inputs, selectedOpOrWorkflow }
  }

  showRunMessage = (inputs: SearchInputs): SearchInputs => {
    const {
      selectedOpOrWorkflow: { name },
    } = inputs
    this.log(
      `\n💻 Run ${this.ux.colors.green('$')} ${this.ux.colors.italic.dim(
        'ops run ' + name,
      )} to test your op. \n`,
    )
    return inputs
  }

  sendAnalytics = (filter: string) => (inputs: SearchInputs) => {
    const {
      selectedOpOrWorkflow,
      selectedOpOrWorkflow: { id: opId, teamID },
    } = inputs
    const teamOp = teamID === this.team.id
    const remote =
      'remote' in selectedOpOrWorkflow ? selectedOpOrWorkflow.remote : false
    try {
      this.services.analytics.track(
        {
          userId: this.user.email,
          teamId: this.team.id,
          event: 'Ops CLI Search',
          properties: {
            email: this.user.email,
            username: this.user.username,
            selectedOp: opId,
            teamOp,
            remote,
            results: this.opsAndWorkflows.length,
            filter,
          },
        },
        this.accessToken,
      )
    } catch (err) {
      this.debug('%O', err)
      throw new AnalyticsError(err)
    }
  }

  _autocompleteSearch = async (_: Answers, input = '') => {
    const { list, options } = this.fuzzyFilterParams()
    const fuzzyResult: Fuzzy[] = fuzzy.filter(input, list, options)
    return fuzzyResult.map(result => result.original)
  }

  private fuzzyFilterParams = () => {
    const list = this.opsAndWorkflows.map(opOrWorkflow => {
      const name = this._formatOpOrWorkflowName(opOrWorkflow)
      return {
        name: `${name} - ${opOrWorkflow.description}`,
        value: opOrWorkflow,
      }
    })
    const options = { extract: el => el.name }
    return { list, options }
  }

  private _formatOpOrWorkflowName = (opOrWorkflow: Op | Workflow) => {
    const name = this.ux.colors.reset.white(opOrWorkflow.name)
    if ('steps' in opOrWorkflow) {
      return `${this.ux.colors.reset(
        this.ux.colors.multiOrange('\u2022'),
      )} ${this._formatOpOrWorkflowEmoji(opOrWorkflow)} ${name}`
    } else {
      return `${this.ux.colors.reset(
        this.ux.colors.multiBlue('\u2022'),
      )} ${this._formatOpOrWorkflowEmoji(opOrWorkflow)} ${name}`
    }
  }

  private _formatOpOrWorkflowEmoji = (opOrWorkflow: Workflow | Op): string => {
    if (opOrWorkflow.teamID == this.team.id) {
      return '🔑 '
    } else if ('local' in opOrWorkflow) {
      return '🖥  '
    } else {
      return '🌎 '
    }
  }

  async run() {
    try {
      await this.isLoggedIn()

      const {
        args: { filter = '' },
      } = this.parse(Search)

      const searchPipeline = asyncPipe(
        this.searchTypePrompt,
        this.showSearchMessage,
        this.getApiOps,
        this.filterApiOps,
        this.getApiWorkflows,
        this.filterApiWorkflows,
        this.getLocalWorkflows,
        this.filterLocalWorkflows,
        this.resolveLocalAndApi,
        this.checkData,
        this.selectOpOrWorkflowPrompt,
        this.showRunMessage,
        this.sendAnalytics(filter),
      )
      await searchPipeline(filter)
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
