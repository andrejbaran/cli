import * as path from 'path'
import { log } from '@cto.ai/sdk'
import Command, { flags } from '../base'
import { Op } from '../types/Op'

import * as fs from 'fs-extra'
import * as yaml from 'yaml'

export default class Publish extends Command {
  static description = 'Publish an op to a team.'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = [
    { name: 'path', description: 'Path to the op you want to publish.' },
  ]

  async run(this: any) {
    try {
      const { args } = this.parse(Publish)
      const opPath = args.path
        ? path.resolve(process.cwd(), args.path)
        : process.cwd()

      this.isLoggedIn()

      const manifest = await fs
        .readFile(path.join(opPath, '/ops.yml'), 'utf8')
        .catch((err: any) => {
          this.log(`Unable to locate ops.yml at ${err.path}`)
          this.exit()
        })

      const pkg: Op = manifest && yaml.parse(manifest)

      await this.config.runHook('validate', pkg)

      let op = await this.client.service('ops').create(
        { ...pkg, teamID: this.team.id },
        {
          headers: {
            Authorization: this.accessToken,
          },
        },
      )

      const res = await this.client.service('registry/token').find({
        query: {
          registryProject: this.team.name,
        },
        headers: {
          Authorization: this.accessToken,
        },
      })

      const {
        registryProject,
        registryUser,
        registryPass,
      } = res.data.registry_tokens[0]
      const ops_registry_auth = {
        username: registryUser,
        password: registryPass,
        serveraddress: `https://${this.ops_registry_host}/${registryProject}`,
      }

      await this.config.runHook('publish', {
        op: op.data,
        registryProject,
        ops_registry_host: `${this.ops_registry_host}/${registryProject}`,
        ops_registry_auth: ops_registry_auth,
      })

      this.analytics.track({
        userId: this.user.email,
        event: 'Ops CLI Publish',
        properties: {
          email: this.user.email,
          username: this.user.username,
          name: op.data.name,
          description: op.data.description,
          image: `${this.ops_registry_host}/${op.data.id.toLowerCase()}`,
          tag: 'latest',
        },
      })
    } catch (err) {
      // TODO: Update when error handling issue gets merged
      this.log(
        `😰 We've encountered a problem. Please try again or contact support@cto.ai and we'll do our best to help.`,
      )
      log.debug('Publish command failed', err)
    }
  }
}
