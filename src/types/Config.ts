/**
 * @author: JP Lew (jp@hackcapital.com)
 * @date: Monday, 15th April 2019 2:29:03 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Thursday, 25th April 2019 4:42:54 pm
 * @copyright (c) 2019 Hack Capital
 */

import Team from './Team'
import User from './User'

interface Config {
  accessToken: string
  team: Team
  user: User
}

export default Config
