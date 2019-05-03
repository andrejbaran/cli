/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Thursday, 25th April 2019 11:44:48 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 1st May 2019 1:38:47 pm
 * @copyright (c) 2019 CTO.ai
 */

export interface RegistryResponse {
  data: {
    registry_tokens: {
      registryProject: string
      registryUser: string
      registryPass: string
    }
  }
}
