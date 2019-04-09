import Command, {flags} from '../base'
const {ux} = require('@cto.ai/sdk')

const ops_registry_host = process.env.OPS_REGISTRY_HOST || 'registry.cto.ai'

export default class Remove extends Command {
  static description = 'describe the command here'

  static args = [
    {name: 'op'}
  ]

  static flags = {
    help: flags.help({char: 'h'})
  }

  async run(this:any) {
    const self = this
    const {args, flags} = this.parse(Remove)

    this.isLoggedIn()

    this.log('')

    await this.client.service('ops').find({
      query: {
        $sort: {
          created_at: -1
        },
        owner: {
          _id: this.user._id
        },
        $limit: 1000
      }
    })
    .then(async function (o) {

      if(!o.data.length) {
        self.log(`✋Nothing found in the registry. Please try again later. \n`);
        self.exit()
      }

      let op = await ux.prompt({
        type: 'list',
        name: 'desync',
        pageSize: 100,
        message: '🗑  Which op would you like to remove?',
        choices: o.data.map(l => {
          return {
            name: `${ux.colors.callOutCyan(l.name)} ${ux.colors.white(l.description)}`,
            value: l
          }
        })
      })

      self.log('\n 🗑 Removing from registry...')
      let data = await self.client.service('ops').remove(op.desync._id)

      self.log('')
      let msg = ux.colors.bold(`${op.desync.name}:${op.desync._id}`)
      self.log(`⚡️ ${msg} has been ${ux.colors.green('removed')} from the registry!`)
      self.log('')
      self.log(`To publish again run: ${ux.colors.green('$')} ${ux.colors.dim('ops publish <path>')}`)
      self.log('')

      self.analytics.track({
        userId: self.user.email,
        event: 'Ops CLI Remove',
        properties: {
          email: this.user.email,
          username: this.user.username,
          id: op.desync._id,
          name: op.desync.name,
          description: op.desync.description,
          image: `${ops_registry_host}/${op.desync.name}`
        }
      })

    })

  }
}
