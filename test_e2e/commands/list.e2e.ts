/**
 * @author: Prachi Singh (prachi@hackcapital.com)
 * @date: Wednesday, 20th November 2019 9:29:57 am
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Wednesday, 20th November 2019 11:02:34 am
 *
 * DESCRIPTION: ops list e2e tests
 *
 * @copyright (c) 2019 Hack Capital
 */

import { run, signin, sleep, cleanup } from '../utils/cmd'
import { EXISTING_USER_NAME } from '../utils/constants'

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 3

beforeEach(async () => {
  try {
    await run(['account:signout'])
  } catch (err) {
    throw err
  }
})

afterAll(async () => {
  await cleanup()
  // avoid jest open handle error
  await sleep(500)
})

test(`it should be able to show the list of ops for the user's team on command ops list`, async () => {
  await signin()
  await sleep(500)

  console.log(`ops list`)

  const result = await run(['list'])
  expect(result).toContain(`Listing ops for team @${EXISTING_USER_NAME}.`)
})

test(`it asserts that op version is never undefined`, async () => {
  await signin()
  await sleep(500)

  console.log(`ops list`)

  const result = await run(['list'])

  // asserts that version is not undefined
  expect(result).not.toContain('(undefined)')
})
