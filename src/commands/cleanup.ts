import { Output } from '@oclif/parser/lib'
import Docker from 'dockerode'
import Command, { flags } from '../base'
import { ImageNotFoundError } from '../errors/CustomErrors'
import { OPS_REGISTRY_HOST } from '../constants/env'

import { OpsFindResponse } from '../types'
import { FeathersClient } from '../services/Feathers'

import getDocker from '~/utils/get-docker'

// get ops matching the provided name
export const getOps = async (
  opName: string,
  teamId: string,
  accessToken: string,
  api: FeathersClient,
): Promise<OpsFindResponse> => {
  return api.find('ops', {
    query: {
      name: opName,
      team_id: teamId,
    },
    headers: {
      Authorization: accessToken,
    },
  })
}

// form docker image name given the name/id and team name
export const formImageName = (
  nameOrId: string,
  teamName: string,
  registryHost: string,
): string => {
  return `${registryHost}/${teamName}/${nameOrId}`
}

// remove the docker images
export const removeImage = async (docker, imageName: string) => {
  await docker
    .getImage(imageName)
    .remove()
    .catch(err => {
      this.debug('%O', err)
      throw new ImageNotFoundError(imageName)
    })
}

export class Cleanup extends Command {
  static description = 'Clean up locally cached docker images.'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = [
    {
      name: 'opName',
      description: 'Name of the op to be cleaned up',
    },
  ]

  docker: Docker | undefined

  async run() {
    const {
      args: { opName },
    }: Output<{}, { opName: string }> = this.parse(Cleanup)
    try {
      this.docker = await getDocker(this, 'publish')

      await this.isLoggedIn()

      if (!this.docker) return

      if (opName === 'all' || !opName) {
        // prune all unused images
        await this.docker.pruneImages()
        this.log(`\n Successfully removed unused images`)
        process.exit()
      }

      const ops: OpsFindResponse = await getOps(
        opName,
        this.team.id,
        this.accessToken,
        this.services.api,
      ).catch(err => {
        this.debug('%O', err)
        throw new Error('API error')
      })
      if (!ops.data) {
        throw new ImageNotFoundError(opName)
      }

      // remove both the images for the matching op name
      const { id, name } = ops.data[0]
      const imagebyId = formImageName(id, this.team.name, OPS_REGISTRY_HOST)
      const imagebyName = formImageName(name, this.team.name, OPS_REGISTRY_HOST)
      await removeImage(this.docker, imagebyId)
      await removeImage(this.docker, imagebyName)
      this.services.analytics.track(
        {
          userId: this.user.email,
          teamId: this.team.id,
          cliEvent: 'Ops CLI Cleanup',
          event: 'Ops CLI Cleanup',
          properties: {
            email: this.user.email,
            username: this.user.username,
          },
        },
        this.accessToken,
      )

      this.log(`\n Successfully removed images for ${opName}`)
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
