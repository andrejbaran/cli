/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 16th April 2019 4:38:01 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Thursday, 5th September 2019 11:08:41 am
 * @copyright (c) 2019 CTO.ai
 */

export interface UserCredentials {
  user: string | undefined
  password: string | undefined
  interactive?: boolean | undefined
  help?: void
  username?: string | undefined
}
