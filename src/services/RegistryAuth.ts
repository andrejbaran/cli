import Debug from 'debug'
import { OPS_REGISTRY_HOST } from '~/constants/env'
import { UserUnauthorized } from '~/errors/CustomErrors'
import { FeathersClient } from '~/services/Feathers'
import { ApiService, RegistryAuth, RegistryResponse } from '~/types'
const debug = Debug('ops:RegistryAuthService')

export class RegistryAuthService {
  constructor(protected api: ApiService = new FeathersClient()) {}
  async get(accessToken: string, teamName: string): Promise<RegistryAuth> {
    try {
      const registryResponse: RegistryResponse = await this.api.find(
        'registry/token',
        {
          query: {
            registryProject: teamName,
          },
          headers: { Authorization: accessToken },
        },
      )

      const {
        registryProject = '',
        registryUser = '',
        registryPass = '',
      } = registryResponse.data.registry_tokens[0]

      const projectFullName = `${OPS_REGISTRY_HOST}/${registryProject}`
      const projectUrl = `https://${projectFullName}`

      const registryAuth: RegistryAuth = {
        authconfig: {
          username: registryUser,
          password: registryPass,
          serveraddress: projectUrl,
        },
        projectFullName,
      }

      return registryAuth
    } catch (err) {
      debug('%O', err)
      throw new UserUnauthorized(err)
    }
  }
}
