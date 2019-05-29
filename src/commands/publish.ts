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
import Docker from 'dockerode'
import Command, { flags } from '../base'
import { OPS_REGISTRY_HOST } from '../constants/env'
import { OP_FILE } from '../constants/opConfig'
import { Op, RegistryAuth } from '../types'
import {
  CouldNotCreateOp,
  DockerPublishNoImageFound,
  MissingRequiredArgument,
  FileNotFoundError,
  InvalidInputCharacter,
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
      )

      if (!registryAuth) {
        throw new Error('could not get registry auth')
      }

      const manifest = await fs
        .readFile(path.join(opPath, OP_FILE), 'utf8')
        .catch((err: any) => {
          throw new FileNotFoundError(err, opPath, OP_FILE)
        })

      const pkg: Op = manifest && yaml.parse(manifest)

      // await this.config.runHook('validate', pkg)
      if (!isValidOpName(pkg)) throw new InvalidInputCharacter('Op Name')

      if (!this.docker) throw new Error('No docker container')
      const list: Docker.ImageInfo[] = await this.docker.listImages()
      const repo = `${OPS_REGISTRY_HOST}/${this.team.name}/${pkg.name}:latest`

      const localImage = list
        .map(this.imageFilterPredicate(repo))
        .find((repoTag: string) => !!repoTag)
      if (!localImage) {
        throw new DockerPublishNoImageFound(pkg.name, this.team.name)
      }
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
      this.debug(err)
      this.config.runHook('error', { err })
    }
  }
}
