import Command, { flags } from '../base'
import { ux } from '@cto.ai/sdk'
import { OPS_REGISTRY_HOST } from '../constants/env'
import { NoOpFoundForDeletion } from '../errors/customErrors'
import { Op, Question } from '~/types'

export default class Remove extends Command {
  static description = 'Remove an op from a team.'

  static args = [
    {
      name: 'opFilter',
      description:
        'A part of the name or description of the op you want to remove.',
    },
  ]

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  getOpPrompt(filteredOpsResponse: Op[]): Question {
    return {
      type: 'list',
      name: 'selected',
      pageSize: 100,
      message: '\n 🗑  Which op would you like to remove?',
      choices: filteredOpsResponse.map(l => {
        return {
          name: `${ux.colors.callOutCyan(l.name)} ${ux.colors.white(
            l.description,
          )} | id: ${ux.colors.white(l.id.toLowerCase())}`,
          value: l,
        }
      }),
    }
  }

  async run() {
    try {
      this.isLoggedIn()
      const { args } = this.parse(Remove)
      // If no argument is given, prompt it instead
      const opFilter = args.opFilter || (await _promptOpFilter())

      const query =
        opFilter && opFilter.length
          ? { search: opFilter, team_id: this.team.id }
          : { team_id: this.team.id }

      const allResponse: { data: Op[] } = await this.api
        .find('ops', {
          query,
          headers: {
            Authorization: this.accessToken,
          },
        })
        .catch(err => {
          this.debug('%O', err)
          throw new Error(err)
        })

      const filteredOpsResponse = (allResponse.data || []).filter(
        op => op.teamID === this.team.id,
      )

      if (!filteredOpsResponse.length) {
        throw new NoOpFoundForDeletion()
      }

      let op: Op
      if (filteredOpsResponse.length === 1) {
        op = filteredOpsResponse[0]
      } else {
        const { selected } = await ux.prompt<{
          selected: Op
        }>(this.getOpPrompt(filteredOpsResponse))
        op = selected
      }

      this.log('\n 🗑  Removing from registry...')

      const { id, name, description } = op

      await this.api
        .remove('ops', id, { headers: { Authorization: this.accessToken } })
        .catch(err => {
          this.debug('%O', err)
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
      this.debug('%O', err)
      this.config.runHook('error', { err })
    }
  }
}

const _promptOpFilter = async (): Promise<{ opFilter: string }> => {
  return ux.prompt<{ opFilter: string }>({
    type: 'input',
    name: 'opFilter',
    message: `\n Please type in the name or description of the op you want to remove ${ux.colors.reset.green(
      '→',
    )}\n ${ux.colors.reset(
      ux.colors.secondary('Leave blank to return all ops you can remove'),
    )} \n\n 🗑  ${ux.colors.reset.white('Name or Description')}`,
    afterMessage: `${ux.colors.reset.green('✔')} Searching for`,
  })
}
