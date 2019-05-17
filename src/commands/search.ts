import fuzzy from 'fuzzy'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as yaml from 'yaml'

import Command, { flags } from '../base'
import { Op, Fuzzy, FindQuery, FindResponse, LocalOp } from '../types'
import { asyncPipe } from '../utils/asyncPipe'
import { AnalyticsError, APIError } from '../errors/customErrors'
import { LOCAL, OP_FILE } from '../constants/opConfig'

export default class Search extends Command {
  static description = 'Search for ops in the registry.'

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

  showSearchMessage = (filter: string) => {
    this.log(
      `\n🔍 ${this.ux.colors.white(
        'Searching team, public, local registries for,',
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
      throw new APIError(err)
    }
  }

  getLocalOps = async ({ apiOps }: { apiOps: Op[] }) => {
    try {
      const manifest = await fs.readFile(
        path.join(process.cwd(), OP_FILE),
        'utf8',
      )
      if (!manifest) {
        return { apiOps, localOps: [] }
      }
      const { ops: localOps = [] } = yaml.parse(manifest)
      return { apiOps, localOps }
    } catch {
      return { apiOps, localOps: [] }
    }
  }

  _removeIfNameOrDescriptionDontContainQuery = (filterQuery: string) => (
    localOp: LocalOp,
  ) =>
    localOp.name.includes(filterQuery) ||
    localOp.description.includes(filterQuery)

  _setTeamIdToLocal = (localOp: LocalOp) => ({ ...localOp, teamID: LOCAL })

  filterLocalOps = (filterQuery: string = '') => ({
    apiOps,
    localOps,
  }: {
    apiOps: Op[]
    localOps: LocalOp[]
  }) => {
    if (!localOps.length) {
      return { apiOps, localOps }
    }

    const filteredLocalOps = localOps
      .filter(this._removeIfNameOrDescriptionDontContainQuery(filterQuery))
      .map(this._setTeamIdToLocal)

    return { apiOps, localOps: filteredLocalOps }
  }

  _removeIfLocalExists = localOps => apiOp => {
    const match = localOps.find(localOp => localOp.name === apiOp.name)
    return !match
  }

  resolveLocalAndApiOps = ({
    apiOps,
    localOps,
  }: {
    apiOps: Op[]
    localOps: LocalOp[]
  }) => {
    const filteredApiOps = apiOps.filter(this._removeIfLocalExists(localOps))
    return [...filteredApiOps, ...localOps]
  }

  checkData = async (filteredOps: Op[]) => {
    if (!filteredOps.length) {
      this.log(
        `\n 😞 No ops found in your team, public or local registry. Try again or run ${this.ux.colors.callOutCyan(
          'ops publish',
        )} to create an op. \n`,
      )
      process.exit()
    }
    this.ops = filteredOps
  }

  askQuestion = async () => {
    return this.ux.prompt({
      type: 'autocomplete',
      name: 'runOp',
      pageSize: 5,
      message: `\nSelect a team, public ${this.ux.colors.multiBlue(
        '\u2749',
      )} or local ${this.ux.colors.successGreen(
        '\u2749',
      )} op to run ${this.ux.colors.reset.green('→')}`,
      source: this._autocompleteSearch.bind(this),
      bottomContent: `\n \n${this.ux.colors.white(
        `Or, run ${this.ux.colors.callOutCyan(
          'ops help',
        )} for usage information.`,
      )}`,
    })
  }

  showRunMessage = answer => {
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
      throw new AnalyticsError(err)
    }
  }

  private async _autocompleteSearch(_: any, input = ''): Promise<object[]> {
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
        return opName
      case LOCAL:
        return `${opName} ${this.ux.colors.reset(
          this.ux.colors.successGreen('\u2749'),
        )}`
      default:
        return `${opName} ${this.ux.colors.reset(
          this.ux.colors.multiBlue('\u2749'),
        )}`
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
        this.getLocalOps,
        this.filterLocalOps(filter),
        this.resolveLocalAndApiOps,
        this.checkData,
        this.askQuestion,
        this.showRunMessage,
        this.sendAnalytics(filter),
      )
      await searchPipeline(filter)
    } catch (err) {
      this.config.runHook('error', { err })
    }
  }
}
