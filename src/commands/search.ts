import Command, {flags} from '../base'
import {Fuzzy} from '../types/fuzzy'
import {Op} from '../types/op'

const {ux} = require('@cto.ai/sdk')
const fuzzy = require('fuzzy')

let ops: Op[] = []

export default class Search extends Command {
  static description = 'Search for ops in the registry.'

  static args = [
    {name: 'filter'}
  ]
  static flags = {
    help: flags.help({char: 'h'})
  }

  async run() {
    const {flags, args} = this.parse(Search)
    const {filter} = args

    this.isLoggedIn()

    this.log(
      `\n🔍 ${ux.colors.white('Searching the repository for')} ${ux.colors.callOutCyan(filter || 'all ops')}...`
    )
    ops = await this._getOps(filter)

    const {runOp} = await ux.prompt({
      type: 'list',
      name: 'runOp',
      pageSize: 100,
      message: '\n 👉 Which op would you like to run?',
      choices: ops.map(op => {
        return {name: `${ux.colors.callOutCyan(op.name)} ${ux.colors.white(op.description)} id: ${ux.colors.white(op._id.toLowerCase())} owner: ${ux.colors.white(op.owner.email)}`, value: op}
      }),
      bottomContent: `\n \n${ux.colors.white(`Or, run ${ux.colors.italic.dim('ops help')} for usage information.`)}`
    })
    this.log(`\n💻 Run ${ux.colors.green('$')} ${ux.colors.italic.dim('ops run ' + runOp.name)}:${ux.colors.dim(runOp._id.toLowerCase())} to test your op. \n`)
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

  private async _getOps(this:any, filter: string | undefined): Promise<Op[]> {

    if (filter) {
      var query = {
        query: {
          $limit: 100,
          $or: [
            {
              name: {
                $search: filter.toLowerCase(),
                options: 'ig'
              }
            },
            {
              description: {
                $search: filter.toLowerCase(),
                options: 'ig'
              }
            }
          ]
        }
      }
    }

    const {data} = await this.client.service('ops').find(query ? query : { query: { $limit: 100 } })

    this.analytics.track({
      userId: this.user.email,
      event: 'Ops CLI Search',
      properties: {
        email: this.user.email,
        username: this.user.username,
        results: data.length,
        filter: filter
      }
    })

    return data
  }
}
