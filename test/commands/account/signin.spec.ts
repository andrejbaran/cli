/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Monday, 6th May 2019 11:06:29 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Monday, 13th May 2019 2:35:33 pm
 * @copyright (c) 2019 CTO.ai
 */

import * as Config from '@oclif/config'
import { MockGoodApiService } from '../../../src/services/mockGoodApi'
import AccountSignin from '../../../src/commands/account/signin'

import { fakeToken } from '../../../src/constants/test'

let cmd: AccountSignin

beforeAll(async () => {
  // reference https://github.com/oclif/command/blob/master/src/command.ts
  // https://github.com/oclif/config/blob/master/src/plugin.ts

  const config = await Config.load()
  // signin = new AccountSignin([], config, new FeathersClient())
  cmd = new AccountSignin([], config, new MockGoodApiService())

  // signinBad = new AccountSignIn([], config, new MockBadApiService())
})

test.skip('should accept valid credentials and return an access token', async () => {
  const credentials = {
    email: 'test@test.com',
    password: 'password',
  }
  const res = await cmd.authenticateUser({ credentials })
  expect(res.accessToken).toBe(fakeToken)
})

describe('mock the feathers client using jest mocks', () => {})
