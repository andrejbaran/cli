import Command, { flags } from '../base'
import { ImageNotFoundError } from '../errors/customErrors'
import { OPS_REGISTRY_HOST } from '../constants/env'
import { Output } from '@oclif/parser/lib'
import { FindResponse } from '../types'
import { FeathersClient } from '../services/feathers'

// get ops matching the provided name
export const getOps = async (
  opName: string,
  teamId: string,
  accessToken: string,
  api: FeathersClient,
): Promise<FindResponse> => {
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
      throw new ImageNotFoundError()
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

  async run() {
    try {
      const {
        args: { opName },
      }: Output<{}, { opName: string }> = this.parse(Cleanup)

      this.isLoggedIn()

      if (!this.docker) return

      if (opName === 'all' || !opName) {
        // prune all unused images
        await this.docker.pruneImages()
        this.log(`\n Successfully removed unused images`)
        process.exit()
      }

      const ops: FindResponse = await getOps(
        opName,
        this.team.id,
        this.accessToken,
        this.api,
      ).catch(() => {
        throw new Error('API error')
      })
      if (!ops.data) {
        throw new ImageNotFoundError()
      }

      // remove both the images for the matching op name
      const { id, name } = ops.data[0]
      const imagebyId = formImageName(id, this.team.name, OPS_REGISTRY_HOST)
      const imagebyName = formImageName(name, this.team.name, OPS_REGISTRY_HOST)
      await removeImage(this.docker, imagebyId)
      await removeImage(this.docker, imagebyName)

      this.log(`\n Successfully removed images for ${opName}`)
    } catch (err) {
      this.config.runHook('error', { err })
    }
  }
}
