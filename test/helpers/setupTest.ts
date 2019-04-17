import { accessTokenFactory, userFactory, teamFactory } from '../factories/'
import { writeConfig } from './manage-config'

let accessToken = accessTokenFactory()
let user = userFactory()
let team = teamFactory()

export default async function setupTest() {
  return await writeConfig({
    accessToken,
    user,
    team,
  })
}
