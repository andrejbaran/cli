/**
 * @author: Prachi Singh (prachi@hackcapital.com)
 * @date: Wednesday, 20th November 2019 1:40:32 pm
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Wednesday, 20th November 2019 2:45:33 pm
 *
 * DESCRIPTION: ops remove e2e only error and non-ok test cases
 *
 * @copyright (c) 2019 Hack Capital
 */
import { run, signin, sleep, cleanupAddedOp, cleanup } from '../utils/cmd'
import {
  ENTER,
  PUBLIC_OP_NAME_WITH_TEAM,
  PUBLIC_OP_NAME_WITH_TEAM_AND_VERSION,
  EXISTING_USER_NAME,
} from '../utils/constants'

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 3

beforeEach(async () => {
  try {
    await run(['account:signout'])
  } catch (err) {
    throw err
  }
})

afterAll(async () => {
  // avoid jest open handle error
  await sleep(500)
})

test('it should error out if ops remove called with invalid op name', async () => {
  await signin()
  await sleep(500)

  console.log(`ops remove invalid-op`)

  const invalidOpName = '@invalid-op-name'
  const result = await run(['remove', invalidOpName])
  expect(result).toContain(
    'Sorry, please provide both the name and version of the op you want to remove',
  )
})

test('it should error out if op trying to remove is not found', async () => {
  await signin()
  await sleep(500)

  console.log(`ops remove not-found-op`)

  const notFoundOpName = 'my-command:0.1.0'
  const result = await run(['remove', notFoundOpName])

  // TODO: Change this to the commented expect below once
  // https://git.cto.ai/ops/api/merge_requests/393 is merged.
  expect(result).toContain(`Looks like an API error occurred`)
  // expect(result).toContain(
  //   `We couldn't find any ops with the name ${notFoundOpName} in the team ${EXISTING_USER_NAME}`,
  // )
})
