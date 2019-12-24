import Debug from 'debug'
import { OPS_REGISTRY_HOST } from '~/constants/env'
import { UserUnauthorized } from '~/errors/CustomErrors'
import { FeathersClient } from '~/services/Feathers'
import { ApiService, RegistryAuth, RegistryCreateResponse } from '~/types'
const debug = Debug('ops:RegistryAuthService')

export class RegistryAuthService {
  constructor(protected api: ApiService = new FeathersClient()) {}

  async create(
    accessToken: string,
    teamname: string,
    opName: string,
    opVersion: string,
    pullAccess: boolean,
    pushAccess: boolean,
  ): Promise<RegistryAuth> {
    try {
      const response: RegistryCreateResponse = await this.api.create(
        '/private/registry/token',
        {
          teamName: teamname,
          opName,
          opVersion,
          pullAccess,
          pushAccess,
        },
        {
          headers: { Authorization: accessToken },
        },
      )

      const {
        teamName = '',
        robotAccountName = '',
        token = '',
        robotID,
      } = response.data

      const projectFullName = `${OPS_REGISTRY_HOST}/${teamName}`
      const projectUrl = `https://${projectFullName}`

      const registryAuth: RegistryAuth = {
        authconfig: {
          username: robotAccountName,
          password: token,
          serveraddress: projectUrl,
        },
        projectFullName,
        robotID,
      }

      return registryAuth
    } catch (err) {
      debug('%O', err)
      throw new UserUnauthorized(err)
    }
  }

  async delete(
    accessToken: string,
    id: number,
    teamName: string,
    opName: string,
    opVersion: string,
  ) {
    try {
      await this.api.remove(`/private/registry/token/`, id.toString(), {
        query: {
          teamName,
          opName,
          opVersion,
        },
        headers: { Authorization: accessToken },
      })
    } catch (err) {
      debug('%0', err)
      throw new UserUnauthorized(err)
    }
  }
}
