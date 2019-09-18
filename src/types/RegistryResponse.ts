/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Thursday, 25th April 2019 11:44:48 am
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Friday, 13th September 2019 5:25:20 pm
 * @copyright (c) 2019 CTO.ai
 */

interface Token {
  registryProject: string
  registryUser: string
  registryPass: string
}

export interface RegistryCreateResponse {
  data: {
    teamName: string
    robotAccountName: string
    token: string
    robotID: number
  }
}
