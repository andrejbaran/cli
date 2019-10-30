import fuzzy from 'fuzzy'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as yaml from 'yaml'
import Command, { flags } from '../base'
import {
  Answers,
  Op,
  Fuzzy,
  Workflow,
  OpsYml,
  SearchInputs,
  OpsFindResponse,
} from '../types'
import { asyncPipe } from '../utils/asyncPipe'
import { AnalyticsError, APIError } from '../errors/CustomErrors'
import {
  OP_FILE,
  COMMAND,
  WORKFLOW,
  WORKFLOW_TYPE,
  GLUECODE_TYPE,
} from '../constants/opConfig'
import { pluralize, parseYaml } from '~/utils'

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

  showSearchMessage = (
    inputs: Pick<SearchInputs, 'filter'>,
  ): Pick<SearchInputs, 'filter'> => {
    const { filter } = inputs
    this.log(
      `\n🔍 Searching ${this.ux.colors.callOutCyan(
        filter || `all ${pluralize(COMMAND)} and ${pluralize(WORKFLOW)}`,
      )}.`,
    )
    return inputs
  }

  getApiOps = async (inputs: SearchInputs): Promise<SearchInputs> => {
    try {
      const findResponse: OpsFindResponse = await this.services.api.find(
        `/ops`,
        {
          headers: {
            Authorization: this.accessToken,
          },
        },
      )
      let { data: apiOps } = findResponse

      apiOps = apiOps.filter(op => op.type !== GLUECODE_TYPE)
      return { ...inputs, apiOps }
    } catch (err) {
      this.debug('error: %O', err)
      throw new APIError(err)
    }
  }

  getLocalWorkflows = async (inputs: SearchInputs): Promise<SearchInputs> => {
    const localWorkflows = []
    try {
      const manifest = await fs.readFile(
        path.join(process.cwd(), OP_FILE),
        'utf8',
      )
      if (!manifest) return inputs

      const { workflows = [] }: OpsYml = parseYaml(manifest)

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
    const { apiOps, localWorkflows } = inputs
    const ops = apiOps.filter(this._removeIfLocalExists(localWorkflows))
    this.opsAndWorkflows = [...ops, ...localWorkflows].sort((a, b) => {
      if (a.name < b.name) return -1
      if (b.name < a.name) return 1
      return 0
    })
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
      message: `\nSelect a public ${this.ux.colors.multiBlue(
        '\u2022Command',
      )} or ${this.ux.colors.multiOrange(
        '\u2022Workflow',
      )} to run ${this.ux.colors.reset.green('→')}\n${this.ux.colors.reset.dim(
        '🔍 Search:',
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
      selectedOpOrWorkflow: { name, teamName },
    } = inputs
    this.log(
      `\n💻 Run ${this.ux.colors.green('$')} ${this.ux.colors.italic.dim(
        'ops run @' + teamName + '/' + name,
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
          cliEvent: 'Ops CLI Search',
          event: 'Ops CLI Search',
          properties: {
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
    const teamName = opOrWorkflow.teamName
      ? `@${this.ux.colors.reset.white(opOrWorkflow.teamName)}/`
      : ''
    if (opOrWorkflow.type === WORKFLOW_TYPE) {
      return `${this.ux.colors.reset(
        this.ux.colors.multiOrange('\u2022'),
      )} ${teamName}${name}`
    } else {
      return `${this.ux.colors.reset(
        this.ux.colors.multiBlue('\u2022'),
      )} ${teamName}${name}`
    }
  }

  async run() {
    const {
      args: { filter = '' },
    } = this.parse(Search)
    try {
      await this.isLoggedIn()

      const searchPipeline = asyncPipe(
        this.showSearchMessage,
        this.getApiOps,
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
