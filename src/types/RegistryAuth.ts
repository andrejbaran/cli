/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Wednesday, 1st May 2019 5:35:37 pm
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Friday, 13th September 2019 5:24:59 pm
 * @copyright (c) 2019 CTO.ai
 */

export interface RegistryAuth {
  authconfig: {
    username: string
    password: string
    serveraddress: string // https://reg.local.hc.ai/jplew
  }
  projectFullName: string // reg.local.hc.ai/jplew
  robotID: number //this is only used to delete the registry token
}
