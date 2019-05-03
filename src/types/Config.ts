/**
 * @author: JP Lew (jp@hackcapital.com)
 * @date: Monday, 15th April 2019 2:29:03 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 1st May 2019 3:04:16 pm
 * @copyright (c) 2019 Hack Capital
 */

import { Team, User } from '.'

export interface Config {
  accessToken: string
  team: Team
  user: User
}
