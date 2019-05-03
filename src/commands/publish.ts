/**
 * @author: Brett Campbell (brett@hackcapital.com)
 * @date: Friday, 5th April 2019 12:06:07 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Friday, 3rd May 2019 11:41:50 am
 * @copyright (c) 2019 CTO.ai
 *
 */

import { log } from '@cto.ai/sdk'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as yaml from 'yaml'
import Command, { flags } from '../base'
import { OPS_REGISTRY_HOST } from '../constants/env'
import { Op, RegistryAuth } from '../types'
import { CouldNotCreateOp } from '../errors'

export default class Publish extends Command {
  static description = 'Publish an op to a team.'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = [
    { name: 'path', description: 'Path to the op you want to publish.' },
  ]

  async run() {
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
          process.exit()
        })

      const pkg: Op = manifest && yaml.parse(manifest)

      await this.config.runHook('validate', pkg)

      let publishOpResponse = await this.api.create(
        'ops',
        { ...pkg, teamID: this.team.id },
        {
          headers: {
            Authorization: this.accessToken,
          },
        },
      )
      if (!publishOpResponse || !publishOpResponse.data) {
        throw new CouldNotCreateOp(
          `There might be a duplicate key violation in the ops table. Also check that you are signed-in correctly. ${
            publishOpResponse.message
          }`,
        )
      }
      const { data: op }: { data: Op } = publishOpResponse

      const registryAuth: RegistryAuth | undefined = await this.getRegistryAuth(
        this.accessToken,
      )

      if (!registryAuth) {
        throw new Error('could not get registry auth')
      }

      await this.config.runHook('publish', {
        op,
        registryAuth,
      })

      this.analytics.track({
        userId: this.user.email,
        event: 'Ops CLI Publish',
        properties: {
          email: this.user.email,
          username: this.user.username,
          name: op.name,
          description: op.description,
          image: `${OPS_REGISTRY_HOST}/${op.id.toLowerCase()}`,
          tag: 'latest',
        },
      })
    } catch (err) {
      this.config.runHook('error', { err })
    }
  }
}
