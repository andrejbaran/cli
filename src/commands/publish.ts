import * as path from 'path'

import Command, { flags } from '../base'
import { Op } from '../types/Op'

import * as fs from 'fs-extra'
import * as yaml from 'yaml'

const ops_registry_path = process.env.OPS_REGISTRY_PATH || 'registry.cto.ai'

export default class Publish extends Command {
  static description = 'describe the command here'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = [{ name: 'path' }]

  async run(this: any) {
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

    let pkg: Op = manifest && yaml.parse(manifest)

    pkg.owner = {
      _id: this.user._id,
      email: this.user.email,
      username: this.user.username,
    }

    await this.config.runHook('validate', pkg)

    let op = await this.client.service('ops').create(pkg)

    await this.client
      .service('ops')
      .patch(op._id, { image: `${ops_registry_path}/${op._id.toLowerCase()}` })

    await this.config.runHook('publish', {
      tag: `${ops_registry_path}/${op._id.toLowerCase()}:latest`,
      opPath,
      op,
    })

    this.analytics.track({
      userId: this.user.email,
      event: 'Ops CLI Publish',
      properties: {
        email: this.user.email,
        username: this.user.username,
        name: op.name,
        description: op.description,
        image: `${ops_registry_path}/${op._id.toLowerCase()}`,
        tag: 'latest',
      },
    })
  }
}
