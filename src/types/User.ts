/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Monday, 15th April 2019 2:29:03 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 12th June 2019 5:12:24 pm
 * @copyright (c) 2019 CTO.ai
 */

export interface User {
  username: string
  email: string
  id: string
  registryHost?: string
  nodeEnv?: string
}
