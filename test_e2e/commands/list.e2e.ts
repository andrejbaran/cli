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

import { run, signin, signout } from '../utils/cmd'
import {
  EXISTING_USER_NAME,
  DEFAULT_TIMEOUT_INTERVAL,
} from '../utils/constants'

jasmine.DEFAULT_TIMEOUT_INTERVAL = DEFAULT_TIMEOUT_INTERVAL

beforeEach(async () => {
  await signin()
})

afterEach(async () => {
  await signout()
})

test(`it should be able to show the list of ops for the user's team on command ops list`, async () => {
  const result = await run(['list'])
  expect(result).toContain(`Listing ops for team @${EXISTING_USER_NAME}.`)
})

test(`it asserts that op version is never undefined`, async () => {
  const result = await run(['list'])
  expect(result).not.toContain('(undefined)')
})
