/**
 * Author: Brett Campbell (brett@hackcapital.com)
 * Date: Saturday, 6th April 2019 10:39:58 pm
 * Last Modified By: Brett Campbell (brett@hackcapital.com)
 * Last Modified Time: Saturday, 6th April 2019 10:40:00 pm
 *
 * DESCRIPTION
 *
 */
import * as path from 'path'

import Command, { flags } from '../base'
import { Op } from '../types/Op'

import { ux } from '@cto.ai/sdk'
import * as fs from 'fs-extra'
import * as yaml from 'yaml'

export default class Build extends Command {
  static description = 'Build your op for sharing.'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = [{ name: 'path' }]

  async run(this: any) {
    const { args } = this.parse(Build)
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
    const op: Op = manifest && yaml.parse(manifest)
    await this.config.runHook('validate', op)

    this.log(
      `🛠  ${ux.colors.white('Building:')} ${ux.colors.callOutCyan(opPath)}\n`,
    )
    await this.config.runHook('build', {
      tag: `${this.ops_registry_host}/${op.name}:latest`,
      opPath,
      op,
    })

    this.analytics.track({
      userId: this.user.email,
      event: 'Ops CLI Build',
      properties: {
        email: this.user.email,
        username: this.user.username,
        name: op.name,
        description: op.description,
        image: `${this.ops_registry_host}/${op.name}`,
      },
    })
  }
}
