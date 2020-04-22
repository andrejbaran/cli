import fuzzy from 'fuzzy'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as yaml from 'yaml'
import Command, { flags } from '../base'
import {
  Answers,
  OpCommand,
  Fuzzy,
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

  ops: OpCommand[] = []

  getApiOpsAndWorkflows = async (
    inputs: SearchInputs,
  ): Promise<SearchInputs> => {
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

      return { ...inputs, apiOps }
    } catch (err) {
      this.debug('error: %O', err)
      throw new APIError(err)
    }
  }

  filterOutWorkflows = (inputs: SearchInputs): SearchInputs => {
    const apiOps = inputs.apiOps.filter(input => input.type !== WORKFLOW_TYPE)
    return { ...inputs, apiOps }
  }

  filterOutGlueCodes = (inputs: SearchInputs): SearchInputs => {
    const apiOps = inputs.apiOps.filter(input => input.type !== GLUECODE_TYPE)
    return { ...inputs, apiOps }
  }

  filterByNameOrDescription = (inputs: SearchInputs) => {
    const apiOps = inputs.apiOps.filter(
      op =>
        op.name.includes(inputs.filter) ||
        op.description.includes(inputs.filter),
    )
    return { ...inputs, apiOps }
  }

  checkData = async (inputs: SearchInputs) => {
    this.ops = inputs.apiOps as OpCommand[]
    if (!this.ops.length) {
      this.log(
        `\n 😞 No ops found in your team, or public workspaces. Try again or run ${this.ux.colors.callOutCyan(
          'ops publish',
        )} to create an op. \n`,
      )
    }
    return inputs
  }

  selectOpPrompt = async (inputs: SearchInputs): Promise<SearchInputs> => {
    const commandText = this.ux.colors.multiBlue('Command')
    const { selectedOp } = await this.ux.prompt<{
      selectedOp: OpCommand
    }>({
      type: 'autocomplete',
      name: 'selectedOp',
      pageSize: 5,
      message: `\nSelect a public ${commandText} to continue ${this.ux.colors.reset.green(
        '→',
      )}\n${this.ux.colors.reset.dim('🔍 Search:')} `,
      source: this._autocompleteSearch.bind(this),
      bottomContent: `\n \n${this.ux.colors.white(
        `Or, run ${this.ux.colors.callOutCyan(
          'ops help',
        )} for usage information.`,
      )}`,
    })
    return { ...inputs, selectedOp }
  }

  showRunMessage = (inputs: SearchInputs): SearchInputs => {
    const {
      selectedOp: { name, teamName },
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
      selectedOp,
      selectedOp: { id: opId, teamID },
    } = inputs
    const teamOp = teamID === this.team.id
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
            results: this.ops.length,
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
    const list = this.ops.map(op => {
      const name = this._formatOpName(op)
      return {
        name: `${name} - ${op.description}`,
        value: op,
      }
    })
    const options = { extract: el => el.name }
    return { list, options }
  }

  private _formatOpName = (op: OpCommand) => {
    const teamName = op.teamName ? `@${op.teamName}/` : ''
    const name = `${this.ux.colors.reset.white(
      `${teamName}${op.name}`,
    )} ${this.ux.colors.reset.dim(`(${op.version})`)}`
    return `${this.ux.colors.reset(this.ux.colors.multiBlue('\u2022'))} ${name}`
  }

  startSpinner = async (inputs: SearchInputs) => {
    await this.ux.spinner.start(
      `🔍 ${this.ux.colors.white('Searching')} ${this.ux.colors.callOutCyan(
        `all ${pluralize(COMMAND)}`,
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
        this.getApiOpsAndWorkflows,
        this.filterByNameOrDescription,
        this.filterOutWorkflows,
        this.filterOutGlueCodes,
        this.checkData,
        this.stopSpinner,
        this.selectOpPrompt,
        this.showRunMessage,
        this.sendAnalytics(filter),
      )
      await searchPipeline({ filter })
    } catch (err) {
      await this.ux.spinner.stop(`${this.ux.colors.errorRed('Failed')}`)
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
