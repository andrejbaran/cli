import Command, { flags } from '../base'
import { Op } from '../types/Op'
import { ux, log } from '@cto.ai/sdk'

let ops: Op[] = []

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

  async run() {
    try {
      const { args } = this.parse(Search)
      const { filter } = args

      this.isLoggedIn()

      this.log(
        `\n🔍 ${ux.colors.white(
          'Searching the repository for',
        )} ${ux.colors.callOutCyan(filter || 'all ops')}...`,
      )
      ops = await this._getOps(filter).catch(err => {
        throw new Error(err)
      })

      if (!ops.length) {
        this.log(
          `\n ✋  No ops found for your team. Run ${ux.colors.callOutCyan(
            'ops publish',
          )} to create an op \n`,
        )
        process.exit()
      }

      const { runOp } = await ux.prompt({
        type: 'list',
        name: 'runOp',
        pageSize: 100,
        message: '\n 👉 Which op would you like to run?',
        choices: ops.map(op => {
          return {
            name: `${ux.colors.callOutCyan(op.name)} ${ux.colors.white(
              op.description,
            )} id: ${ux.colors.white(op.id.toLowerCase())}`,
            value: op,
          }
        }),
        bottomContent: `\n \n${ux.colors.white(
          `Or, run ${ux.colors.italic.dim('ops help')} for usage information.`,
        )}`,
      })
      this.log(
        `\n💻 Run ${ux.colors.green('$')} ${ux.colors.italic.dim(
          'ops run ' + runOp.name,
        )}:${ux.colors.dim(runOp.id.toLowerCase())} to test your op. \n`,
      )

      this.analytics.track({
        userId: this.user.email,
        event: 'Ops CLI Search',
        properties: {
          email: this.user.email,
          username: this.user.username,
          results: ops.length,
          filter,
        },
      })
    } catch (err) {
      // TODO: Update when error handling issue gets merged
      this.log(
        `😰 We've encountered a problem. Please try again or contact support@cto.ai and we'll do our best to help.`,
      )
      log.debug('Search command failed', err)
    }
  }

  // private _autocompleteSearch(_: any, input = ''): Promise<string[]> {
  //   return new Promise(resolve => {
  //     const fuzzyResult: Fuzzy[] = fuzzy.filter(input, ops.map(op => {
  //       return `${ux.colors.callOutCyan(op.name)} ${ux.colors.white(op.description)}`
  //     }))
  //     resolve(fuzzyResult.map(result => result.original)
  //     )
  //   })
  // }

  private async _getOps(this: any, filter: string | undefined): Promise<Op[]> {
    const query = filter
      ? { search: filter, team_id: this.team.id }
      : { team_id: this.team.id }

    const { data } = await this.client.service('ops').find({
      query,
      headers: {
        Authorization: this.accessToken,
      },
    })

    return data || []
  }
}
