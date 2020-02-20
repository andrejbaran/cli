/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 11th June 2019 6:30:38 pm
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Monday, 21st October 2019 10:06:37 am
 * @copyright (c) 2019 CTO.ai
 */

import { cleanup, run, signin, signout } from '../../utils/cmd'
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

afterAll(async () => {
  await cleanup()
})

test('it should signin, team:switch', async () => {
  const teamSwitchRes = await run(['team:switch'])
  expect(teamSwitchRes).toContain(`Here's the list of your teams`)
  expect(teamSwitchRes).toContain(EXISTING_USER_NAME)
})
