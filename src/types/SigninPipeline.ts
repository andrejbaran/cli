/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Wednesday, 24th April 2019 11:31:59 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Thursday, 25th April 2019 3:59:33 pm
 * @copyright (c) 2019 CTO.ai
 */

import MeResponse from './MeResponse'
import UserCredentials from './UserCredentials'

export default interface SigninPipeline {
  accessToken: string
  meResponse: MeResponse
  credentials: UserCredentials
}
