/**
 * @author: Vincent Tan (vincent@cto.ai)
 * @date: Wed 19 Feb 2020 16:09:16 PST
 * @lastModifiedBy: Vincent Tan (vincent@cto.ai)
 * @lastModifiedTime: Wed 19 Feb 2020 16:09:16 PST
 * @copyright (c) 2020 CTO.ai
 */

import { run, signin, signout } from '../../utils/cmd'
import {
  EXISTING_USER_NAME,
  DEFAULT_TIMEOUT_INTERVAL,
} from '../../utils/constants'

jasmine.DEFAULT_TIMEOUT_INTERVAL = DEFAULT_TIMEOUT_INTERVAL

beforeEach(async () => {
  await signin()
})

afterEach(async () => {
  await signout()
})

test('it should signin, team:list', async () => {
  const teamListRes = await run(['team:list'])
  expect(teamListRes).toContain(`Here's the list of your teams`)
  expect(teamListRes).toContain(EXISTING_USER_NAME)
})
