import fuzzy from 'fuzzy'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as yaml from 'yaml'
import Command, { flags } from '../base'
import {
  Answers,
  OpCommand,
  Fuzzy,
  OpWorkflow,
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
        'Filters Op results which include filter text in Op name or description.',
    },
  ]
  static flags = {
    help: flags.help({ char: 'h' }),
  }

  opsAndWorkflows: (OpCommand | OpWorkflow)[] = []

  getApiOps = async (inputs: SearchInputs): Promise<SearchInputs> => {
    try {
      const findResponse: OpsFindResponse = await this.services.api.find(
        `/private/ops`,
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
    workflow: OpWorkflow,
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
  _removeIfLocalExists = (workflows: OpWorkflow[]) => (apiOp: OpCommand) => {
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
    const commandText = this.ux.colors.multiBlue('\u2022Command')
    const workflowText = this.ux.colors.multiOrange('\u2022Workflow')
    const { selectedOpOrWorkflow } = await this.ux.prompt<{
      selectedOpOrWorkflow: OpCommand | OpWorkflow
    }>({
      type: 'autocomplete',
      name: 'selectedOpOrWorkflow',
      pageSize: 5,
      message: `\nSelect a public ${commandText} or ${workflowText} to continue ${this.ux.colors.reset.green(
        '→',
      )}\n${this.ux.colors.reset.dim('🔍 Search:')} `,
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

  sendAnalytics = (filter: string) => async (inputs: SearchInputs) => {
    const {
      selectedOpOrWorkflow,
      selectedOpOrWorkflow: { id: opId, teamID },
    } = inputs
    const teamOp = teamID === this.team.id
    const runtime =
      'runtime' in selectedOpOrWorkflow ? selectedOpOrWorkflow.runtime : false
    try {
      this.services.analytics.track(
        {
          userId: this.user.email,
          teamId: this.team.id,
          cliEvent: 'Ops CLI Search',
          event: 'Ops CLI Search',
          properties: {
            email: this.user.email,
            username: this.user.username,
            selectedOp: opId,
            teamOp,
            runtime,
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

  private _formatOpOrWorkflowName = (opOrWorkflow: OpCommand | OpWorkflow) => {
    const teamName = opOrWorkflow.teamName ? `@${opOrWorkflow.teamName}/` : ''
    const name = `${this.ux.colors.reset.white(
      `${teamName}${opOrWorkflow.name}`,
    )} ${this.ux.colors.reset.dim(`(${opOrWorkflow.version})`)}`
    if (opOrWorkflow.type === WORKFLOW_TYPE) {
      return `${this.ux.colors.reset(
        this.ux.colors.multiOrange('\u2022'),
      )} ${name}`
    } else {
      return `${this.ux.colors.reset(
        this.ux.colors.multiBlue('\u2022'),
      )} ${name}`
    }
  }

  startSpinner = async (inputs: SearchInputs) => {
    await this.ux.spinner.start(
      `🔍 ${this.ux.colors.white('Searching')} ${this.ux.colors.callOutCyan(
        `all ${pluralize(COMMAND)} and ${pluralize(WORKFLOW)}`,
      )}`,
    )
    return inputs
  }

  stopSpinner = async (inputs: SearchInputs) => {
    await this.ux.spinner.stop(`${this.ux.colors.successGreen('Done')}`)
    return inputs
  }

  async run() {
    const {
      args: { filter = '' },
    } = this.parse(Search)

    try {
      await this.isLoggedIn()

      const searchPipeline = asyncPipe(
        this.startSpinner,
        this.getApiOps,
        this.getLocalWorkflows,
        this.filterLocalWorkflows,
        this.resolveLocalAndApi,
        this.checkData,
        this.stopSpinner,
        this.selectOpOrWorkflowPrompt,
        this.showRunMessage,
        this.sendAnalytics(filter),
      )
      await searchPipeline(filter)
    } catch (err) {
      await this.ux.spinner.stop(`${this.ux.colors.errorRed('Failed')}`)
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
