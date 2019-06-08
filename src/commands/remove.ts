import Command, { flags } from '../base'
import { ux } from '@cto.ai/sdk'
import { OPS_REGISTRY_HOST } from '../constants/env'
import { NoOpFoundForDeletion } from '../errors/customErrors'
import { Op } from '~/types'

export default class Remove extends Command {
  static description = 'Remove an op from a team.'

  static args = [
    { name: 'opName', description: 'Name of the op you want to remove.' },
  ]

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  async run() {
    try {
      this.isLoggedIn()

      const {
        args: { opName },
      } = this.parse(Remove)

      const query = opName
        ? { search: opName, team_id: this.team.id }
        : { team_id: this.team.id }

      const opsResponse: { data: Op[] } = await this.api
        .find('ops', {
          query,
          headers: {
            Authorization: this.accessToken,
          },
        })
        .catch(err => {
          this.debug(err)
          throw new Error(err)
        })

      if (!opsResponse.data.length) {
        throw new NoOpFoundForDeletion()
      }

      let op: Op
      if (!opName) {
        const { selected }: { selected: Op } = await ux.prompt({
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
        op = selected
      } else {
        op = opsResponse.data[0]
      }

      this.log('\n 🗑  Removing from registry...')

      const { id, name, description } = op

      await this.api
        .remove('ops', id, { headers: { Authorization: this.accessToken } })
        .catch(err => {
          this.debug(err)
          throw new Error(err)
        })

      this.log(
        `\n ⚡️ ${ux.colors.bold(`${name}:${id}`)} has been ${ux.colors.green(
          'removed',
        )} from the registry!`,
      )

      this.log(
        `\n To publish again run: ${ux.colors.green('$')} ${ux.colors.dim(
          'ops publish <path>',
        )}\n`,
      )

      this.analytics.track({
        userId: this.user.email,
        event: 'Ops CLI Remove',
        properties: {
          email: this.user.email,
          username: this.user.username,
          id,
          name,
          description,
          image: `${OPS_REGISTRY_HOST}/${name}`,
        },
      })
    } catch (err) {
      this.debug(err)
      this.config.runHook('error', { err })
    }
  }
}
