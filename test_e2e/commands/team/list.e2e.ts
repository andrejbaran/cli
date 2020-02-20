/**
 * @author: Vincent Tan (vincent@cto.ai)
 * @date: Wed 19 Feb 2020 16:09:16 PST
 * @lastModifiedBy: Vincent Tan (vincent@cto.ai)
 * @lastModifiedTime: Wed 19 Feb 2020 16:09:16 PST
 * @copyright (c) 2020 CTO.ai
 */

import { run, signin, sleep } from '../../utils/cmd'
import { EXISTING_USER_NAME } from '../../utils/constants'

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 3

beforeEach(async () => {
  await run(['account:signout'])
})

afterAll(async () => {
  // avoid jest open handle error
  await sleep(500)
})

test('it should signin, team:list', async () => {
  console.log('it should signin, team:list')
  await signin()
  await sleep(500)

  const teamListRes = await run(['team:list'])

  expect(teamListRes).toContain(`Here's the list of your teams`)
  expect(teamListRes).toContain(EXISTING_USER_NAME)
  await sleep(500)
})
