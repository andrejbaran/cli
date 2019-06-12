/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 11th June 2019 6:30:38 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 12th June 2019 11:35:27 am
 * @copyright (c) 2019 CTO.ai
 */

import { run, signin, sleep, signup, cleanup } from '../../utils/cmd'
import {
  NEW_USER_EMAIL,
  NEW_USER_NAME,
  NEW_USER_PASSWORD,
} from '../../utils/constants'

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 3

beforeEach(async () => {
  try {
    await run(['account:signout'])
  } catch (err) {
    console.error(err)
  }
})

afterAll(async () => {
  // avoid jest open handle error
  await sleep(500)
})

test('it should signup, signin, team:switch', async () => {
  console.log('it should signup, signin, team:switch')
  await signup(NEW_USER_EMAIL, NEW_USER_NAME, NEW_USER_PASSWORD)

  await signin(NEW_USER_EMAIL, NEW_USER_PASSWORD)

  try {
    const teamSwitchRes = await run(['team:switch'])

    expect(teamSwitchRes).toContain(`Here's the list of your teams`)
    expect(teamSwitchRes).toContain(NEW_USER_NAME)
  } catch (e) {
    console.error('team:switch', e)
  }
  await sleep(500)
  await cleanup()
})
