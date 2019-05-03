import Command, { flags } from '../base'
import { ux, log } from '@cto.ai/sdk'
import { OPS_REGISTRY_HOST } from '../constants/env'

export default class Remove extends Command {
  static description = 'Remove an op from a team.'

  static args = [
    { name: 'op', description: 'Name of the op you want to remove.' },
  ]

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  async run() {
    try {
      const self = this
      this.isLoggedIn()

      const {
        args: { opName },
      } = this.parse(Remove)

      const query = opName
        ? { search: opName, team_id: self.team.id }
        : { team_id: self.team.id }

      const opsResponse = await this.api
        .find('ops', {
          query,
          headers: {
            Authorization: this.accessToken,
          },
        })
        .catch(err => {
          throw new Error(err)
        })

      if (!opsResponse.data) {
        self.log(
          '\n ✋  Nothing found in the registry. Please try again later. \n',
        )
        process.exit()
      }

      let op
      if (!opName) {
        const data = await ux.prompt({
          type: 'list',
          name: 'selected',
          pageSize: 100,
          message: '\n 🗑  Which op would you like to remove?',
          choices: opsResponse.data.map(l => {
            return {
              name: `${ux.colors.callOutCyan(l.name)} ${ux.colors.white(
                l.description,
              )} | id: ${ux.colors.white(l.id.toLowerCase())}`,
              value: l,
            }
          }),
        })
        op = data.selected
      } else {
        op = opsResponse.data[0]
      }

      self.log('\n 🗑  Removing from registry...')

      const { id, name, description } = op

      await this.api
        .remove('ops', id, { headers: { Authorization: this.accessToken } })
        .catch(err => {
          throw new Error(err)
        })

      self.log(
        `\n ⚡️ ${ux.colors.bold(`${name}:${id}`)} has been ${ux.colors.green(
          'removed',
        )} from the registry!`,
      )

      self.log(
        `\n To publish again run: ${ux.colors.green('$')} ${ux.colors.dim(
          'ops publish <path>',
        )}\n`,
      )

      self.analytics.track({
        userId: self.user.email,
        event: 'Ops CLI Remove',
        properties: {
          email: self.user.email,
          username: self.user.username,
          id,
          name,
          description,
          image: `${OPS_REGISTRY_HOST}/${name}`,
        },
      })
    } catch (err) {
      // TODO: Update when error handling issue gets merged
      this.log(
        `😰 We've encountered a problem. Please try again or contact support@cto.ai and we'll do our best to help.`,
      )
      log.debug('Remove command failed', err)
    }
  }
}
