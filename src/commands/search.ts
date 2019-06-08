import fuzzy from 'fuzzy'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as yaml from 'yaml'
import Command, { flags } from '../base'
import {
  Answers,
  SourceResult,
  Question,
  Op,
  Fuzzy,
  FindQuery,
  FindResponse,
  Workflow,
} from '../types'
import { asyncPipe } from '../utils/asyncPipe'
import { AnalyticsError, APIError } from '../errors/customErrors'
import { WORKFLOW, OP_FILE } from '../constants/opConfig'

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

  ops: Op[] = []

  searchPrompt: Question = {
    type: 'autocomplete',
    name: 'runOp',
    pageSize: 5,
    message: `\nSelect a ${this.ux.colors.errorRed(
      '\u2749',
    )} team ${this.ux.colors.multiBlue(
      '\u2749',
    )} public or ${this.ux.colors.successGreen(
      '\u2749',
    )} local op to run ${this.ux.colors.reset.green('→')}`,
    source: this._autocompleteSearch.bind(this),
    bottomContent: `\n \n${this.ux.colors.white(
      `Or, run ${this.ux.colors.callOutCyan(
        'ops help',
      )} for usage information.`,
    )}`,
  }

  showSearchMessage = (filter: string) => {
    this.log(
      `\n🔍 ${this.ux.colors.white(
        'Searching team, public & local workspaces for ',
      )} ${this.ux.colors.callOutCyan(filter || 'all ops')}.`,
    )
    return filter
  }

  getApiOps = async (filter: string) => {
    try {
      const query: FindQuery = filter
        ? { search: filter, team_id: this.team.id }
        : { team_id: this.team.id }

      const findResponse: FindResponse = await this.api.find('ops', {
        query,
        headers: {
          Authorization: this.accessToken,
        },
      })

      const { data: apiOps } = findResponse
      return { apiOps }
    } catch (err) {
      this.debug('error: %O', err)
      throw new APIError(err)
    }
  }

  getWorkflows = async ({ apiOps }: { apiOps: Op[] }) => {
    try {
      const manifest = await fs.readFile(
        path.join(process.cwd(), OP_FILE),
        'utf8',
      )
      if (!manifest) {
        return { apiOps, workflows: [] }
      }

      const { ops: workflows = [] }: { ops: Workflow[] } = yaml.parse(manifest)
      return { apiOps, workflows }
    } catch {
      return { apiOps, workflows: [] }
    }
  }

  _removeIfNameOrDescriptionDontContainQuery = (filterQuery: string) => (
    workflow: Workflow,
  ) =>
    workflow.name.includes(filterQuery) ||
    workflow.description.includes(filterQuery)

  _setTeamIdToLocal = (workflow: Workflow) => ({
    ...workflow,
    teamID: WORKFLOW,
  })

  filterWorkflows = (filterQuery: string = '') => ({
    apiOps,
    workflows,
  }: {
    apiOps: Op[]
    workflows: Workflow[]
  }) => {
    if (!workflows.length) {
      return { apiOps, workflows }
    }

    const filteredWorkflows = workflows
      .filter(this._removeIfNameOrDescriptionDontContainQuery(filterQuery))
      .map(this._setTeamIdToLocal)

    return { apiOps, workflows: filteredWorkflows }
  }

  _removeIfLocalExists = (workflows: Workflow[]) => (apiOp: Op) => {
    const match = workflows.find(workflow => workflow.name === apiOp.name)
    return !match
  }

  resolveLocalAndApiOps = ({
    apiOps,
    workflows,
  }: {
    apiOps: Op[]
    workflows: Workflow[]
  }) => {
    const filteredApiOps = apiOps.filter(this._removeIfLocalExists(workflows))
    return [...filteredApiOps, ...workflows]
  }

  checkData = async (filteredOps: Op[]) => {
    if (!filteredOps.length) {
      this.log(
        `\n 😞 No ops found in your team, public or local workspaces. Try again or run ${this.ux.colors.callOutCyan(
          'ops publish',
        )} to create an op. \n`,
      )
      process.exit()
    }
    this.ops = filteredOps
  }

  askQuestion = async () => {
    return this.ux.prompt(this.searchPrompt)
  }

  showRunMessage = (answer: { runOp: SourceResult }) => {
    const { runOp } = answer
    this.log(
      `\n💻 Run ${this.ux.colors.green('$')} ${this.ux.colors.italic.dim(
        'ops run ' + runOp.name,
      )} to test your op. \n`,
    )
  }

  sendAnalytics = (filter: string) => () => {
    try {
      this.analytics.track({
        userId: this.user.email,
        event: 'Ops CLI Search',
        properties: {
          email: this.user.email,
          username: this.user.username,
          results: this.ops.length,
          filter,
        },
      })
    } catch (err) {
      this.debug(err)
      throw new AnalyticsError(err)
    }
  }

  private async _autocompleteSearch(_: Answers, input = '') {
    const { list, options } = this.fuzzyFilterParams()
    const fuzzyResult: Fuzzy[] = fuzzy.filter(input, list, options)
    return fuzzyResult.map(result => result.original)
  }

  private fuzzyFilterParams = () => {
    const list = this.ops.map(op => {
      const opName = this._formatOpName(op)
      return {
        name: `${opName} - ${op.description}`,
        value: op,
      }
    })
    const options = { extract: el => el.name }
    return { list, options }
  }

  private _formatOpName = (op: Op) => {
    const opName = this.ux.colors.reset.white(op.name)
    switch (op.teamID) {
      case this.team.id:
        return `${this.ux.colors.reset(
          this.ux.colors.errorRed('\u2749'),
        )} ${opName}`
      case WORKFLOW:
        return `${this.ux.colors.reset(
          this.ux.colors.successGreen('\u2749'),
        )} ${opName} `
      default:
        return `${this.ux.colors.reset(
          this.ux.colors.multiBlue('\u2749'),
        )} ${opName} `
    }
  }

  async run() {
    try {
      this.isLoggedIn()

      const {
        args: { filter = '' },
      } = this.parse(Search)

      const searchPipeline = asyncPipe(
        this.showSearchMessage,
        this.getApiOps,
        this.getWorkflows,
        this.filterWorkflows(filter),
        this.resolveLocalAndApiOps,
        this.checkData,
        this.askQuestion,
        this.showRunMessage,
        this.sendAnalytics(filter),
      )
      await searchPipeline(filter)
    } catch (err) {
      this.debug(err)
      this.config.runHook('error', { err })
    }
  }
}
