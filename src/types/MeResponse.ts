/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 23rd April 2019 3:51:09 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 24th April 2019 11:46:29 am
 * @copyright (c) 2019 CTO.ai
 */
import Team from './Team'

interface MeResponse {
  me: Me
  teams: Team[]
}

interface Email {
  verified: boolean
  address: string
}

interface Me {
  id: string
  username: string
  password: string
  emails: Email[]
  firstName: string
  lastName: string
  registry_user: string
  registry_pass: string
  createdAt: string
  updatedAt: string
}

export default MeResponse
