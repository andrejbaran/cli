/**
 * @author: JP Lew (jp@hackcapital.com)
 * @date: Monday, 15th April 2019 2:29:03 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Friday, 10th May 2019 10:50:33 am
 * @copyright (c) 2019 Hack Capital
 */

import { Team, User, Tokens } from '.'

export interface Config {
  tokens: Tokens
  team: Team
  user: User
  ignoreMountWarnings?: boolean
}
