import {expect, test} from '@oclif/test'

import Team from '../../src/types/Team';
import User from '../../src/types/User'
import {accessTokenFactory, userFactory, teamFactory} from '../factories/'
import {clearConfig, writeConfig} from '../helpers/manage-config'

let accessToken: string
let user: User
let team: Team
describe('search', () => {
  beforeEach(async () => {
    accessToken = accessTokenFactory()
    user = userFactory()
    team = teamFactory()
    await writeConfig({ accessToken, user, team })
  })
  afterEach(async () => {
    await clearConfig()
  })

  test
    .stdout()
    .command(['run'])
    .it('should error out if no argument is provided', ctx => {
      expect(ctx.stdout).to.contain('Please enter the name or path of the op')
    })

  // TODO NA: Create better tests for running an op with/without arguments
})
