/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Wednesday, 1st May 2019 5:35:37 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Thursday, 2nd May 2019 12:15:50 pm
 * @copyright (c) 2019 CTO.ai
 */

export interface RegistryAuth {
  authconfig: {
    username: string
    password: string
    serveraddress: string // https://reg.local.hc.ai/jplew
  }
  projectFullName: string // reg.local.hc.ai/jplew
}
