import { MockGoodApiService } from '../../../src/services/mockGoodApi'
import { FeathersClient } from '../../../src/services/feathers'
import AccountSignin from '../../../src/commands/account/signin'
import * as Config from '@oclif/config'

import { fakeToken } from '../../../src/constants/test'

let signin: AccountSignin

beforeAll(async () => {
  // reference https://github.com/oclif/command/blob/master/src/command.ts
  // https://github.com/oclif/config/blob/master/src/plugin.ts

  const config = await Config.load()
  // signin = new AccountSignin([], config, new FeathersClient())
  signin = new AccountSignin([], config, new MockGoodApiService())
  // signinBad = new AccountSignIn([], config, new MockBadApiService())
})

test('should accept valid credentials and return an access token', async () => {
  const credentials = {
    email: 'test@test.com',
    password: 'password',
  }
  const res = await signin.authenticateUser({ credentials })
  expect(res.accessToken).toBe(fakeToken)
})
