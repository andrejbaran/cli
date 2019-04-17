/**
 * @author: JP Lew (jp@hackcapital.com)
 * @date: Monday, 15th April 2019 2:29:03 pm
 * @lastModifiedBy: JP Lew (jp@hackcapital.com)
 * @lastModifiedTime: Monday, 15th April 2019 3:54:15 pm
 * @copyright (c) 2019 Hack Capital
 */

import Team from './Team'
import User from './User'

interface Config {
  team: Team
  accessToken: string
  user: User
}

export default Config
