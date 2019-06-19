/**
 * @author: Brett Campbell (brett@hackcapital.com)
 * @date: Friday, 5th April 2019 12:06:07 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Friday, 17th May 2019 6:28:25 pm
 * @copyright (c) 2019 CTO.ai
 *
 */

import * as fs from 'fs-extra'
import * as path from 'path'
import * as yaml from 'yaml'
import { ux } from '@cto.ai/sdk'
import Docker from 'dockerode'
import Command, { flags } from '../base'
import { OPS_REGISTRY_HOST } from '../constants/env'
import { OP_FILE } from '../constants/opConfig'
import { Container, Op, RegistryAuth, OpsYml } from '../types'
import {
  CouldNotCreateOp,
  DockerPublishNoImageFound,
  MissingRequiredArgument,
  FileNotFoundError,
  InvalidInputCharacter,
  NoOpsFound,
} from '../errors/customErrors'
import { isValidOpName } from '../utils/validate'
import getDocker from '~/utils/get-docker'

export default class Publish extends Command {
  static description = 'Publish an op to a team.'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = [
    { name: 'path', description: 'Path to the op you want to publish.' },
  ]
  imageFilterPredicate = (repo: string) => ({ RepoTags }: Docker.ImageInfo) => {
    if (!RepoTags) return
    return RepoTags.find((repoTag: string) => repoTag.includes(repo))
  }

  docker: Docker | undefined

  async run() {
    try {
      const { args } = this.parse(Publish)
      if (!args.path) throw new MissingRequiredArgument('ops publish')

      this.docker = await getDocker(this, 'publish')

      const opPath = args.path
        ? path.resolve(process.cwd(), args.path)
        : process.cwd()

      this.isLoggedIn()

      const registryAuth: RegistryAuth | undefined = await this.getRegistryAuth(
        this.accessToken,
        this.team.name,
      )
      if (!registryAuth) {
        throw new Error('could not get registry auth')
      }

      const manifest = await fs
        .readFile(path.join(opPath, OP_FILE), 'utf8')
        .catch((err: any) => {
          this.debug('%O', err)
          throw new FileNotFoundError(err, opPath, OP_FILE)
        })

      let { ops, version }: OpsYml = manifest && yaml.parse(manifest)
      if (!ops) {
        throw new NoOpsFound()
      }

      if (ops.length > 1) {
        const answers = await ux.prompt<Container<Op[]>>({
          type: 'checkbox',
          name: 'ops',
          message: `\n Which ops would you like to publish ${ux.colors.reset.green(
            '→',
          )}`,
          choices: ops.map(op => {
            return {
              value: op,
              name: `${op.name} - ${op.description}`,
            }
          }),
          validate: input => input.length > 0,
        })
        ops = answers.ops
      }
      await this.opsPublishLoop(ops, registryAuth, version)
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err })
    }
  }

  opsPublishLoop = async (
    ops: Op[],
    registryAuth: RegistryAuth,
    version: string,
  ) => {
    for (let op of ops) {
      if (!isValidOpName(op)) throw new InvalidInputCharacter('Op Name')

      if (!this.docker) throw new Error('No docker container')
      const list: Docker.ImageInfo[] = await this.docker.listImages()
      const repo = `${OPS_REGISTRY_HOST}/${this.team.name}/${op.name}:latest`

      const localImage = list
        .map(this.imageFilterPredicate(repo))
        .find((repoTag: string) => !!repoTag)
      if (!localImage) {
        throw new DockerPublishNoImageFound(op.name, this.team.name)
      }
      let publishOpResponse
      try {
        publishOpResponse = await this.api.create(
          'ops',
          { ...op, version, teamID: this.team.id },
          {
            headers: {
              Authorization: this.accessToken,
            },
          },
        )
      } catch (err) {
        this.debug('%O', err)
        throw new CouldNotCreateOp(err.message)
      }
      const { data: apiOp }: { data: Op } = publishOpResponse

      await this.config.runHook('publish', {
        apiOp,
        registryAuth,
      })

      this.analytics.track({
        userId: this.user.email,
        event: 'Ops CLI Publish',
        properties: {
          email: this.user.email,
          username: this.user.username,
          name: apiOp.name,
          description: apiOp.description,
          image: `${OPS_REGISTRY_HOST}/${apiOp.id.toLowerCase()}`,
          tag: 'latest',
        },
      })
    }
  }
}
