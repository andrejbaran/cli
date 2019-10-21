/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 11th June 2019 6:30:38 pm
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Monday, 21st October 2019 10:06:37 am
 * @copyright (c) 2019 CTO.ai
 */

import { cleanup, run, signin, sleep } from '../../utils/cmd'
import { EXISTING_USER_NAME } from '../../utils/constants'

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 3

beforeEach(async () => {
  await run(['account:signout'])
})

afterAll(async () => {
  // avoid jest open handle error
  await sleep(500)
})

test('it should signin, team:switch', async () => {
  console.log('it should signin, team:switch')
  await signin()
  await sleep(500)

  const teamSwitchRes = await run(['team:switch'])

  expect(teamSwitchRes).toContain(`Here's the list of your teams`)
  expect(teamSwitchRes).toContain(EXISTING_USER_NAME)
  await sleep(500)
})
