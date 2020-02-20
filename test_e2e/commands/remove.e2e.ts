/**
 * @author: Prachi Singh (prachi@hackcapital.com)
 * @date: Wednesday, 20th November 2019 1:40:32 pm
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Friday, 29th November 2019 1:28:26 pm
 *
 * DESCRIPTION: ops remove e2e only error and non-ok test cases
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

test('it should error out if ops remove called with invalid op name', async () => {
  const invalidOpName = '@invalid-op-name'
  const result = await run(['remove', invalidOpName])
  expect(result).toContain('Sorry')
})

test('it should error out if op trying to remove is not found', async () => {
  const notFoundOpName = 'my-command:0.1.0'
  const result = await run(['remove', notFoundOpName])
  expect(result).toContain(
    `We couldn't find any ops with the name ${notFoundOpName} in the team ${EXISTING_USER_NAME}`,
  )
})
