/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 23rd April 2019 3:51:09 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 1st May 2019 3:06:30 pm
 * @copyright (c) 2019 CTO.ai
 */
import { Team } from '.'

export interface MeResponse {
  me: Me
  teams: Team[]
}
interface Me {
  id: string
  username: string
  email: string
}
