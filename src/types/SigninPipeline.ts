/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Wednesday, 24th April 2019 11:31:59 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Friday, 16th August 2019 9:43:28 am
 * @copyright (c) 2019 CTO.ai
 */

import { MeResponse, Tokens } from '.'

export interface SigninPipeline {
  tokens: Tokens
  meResponse: MeResponse
}
