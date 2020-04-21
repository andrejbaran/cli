/**
 * This test suite only tests error cases because of the pre-requisite of having a publishable op
 * and side-effect of needing to remove the docker image after.
 * The success functionality exists in the test suite, and thsi file only handles the error
 */

import fs from 'fs-extra'
import { run, signin, signout } from '../utils/cmd'
import {
  INVALID_OP_PATH,
  ENTER,
  SPACE,
  INVALID_COMMAND_NAME,
  INVALID_COMMAND_DESCRIPTION,
  INVALID_COMMAND_PUBLISH_DESCRIPTION,
  EXISTING_USER_NAME,
  DEFAULT_TIMEOUT_INTERVAL,
} from '../utils/constants'

jasmine.DEFAULT_TIMEOUT_INTERVAL = DEFAULT_TIMEOUT_INTERVAL

beforeEach(async () => {
  await signin()
})

afterEach(async () => {
  await signout()
  if (fs.existsSync(INVALID_COMMAND_NAME)) {
    fs.removeSync(INVALID_COMMAND_NAME)
  }
})

test('publish should error out if no ops.yml is given', async () => {
  const result = await run(['publish', INVALID_OP_PATH], [ENTER])
  expect(result).toContain(
    "🤔 Looks like the file ops.yml wasn't found in path:",
  )
  expect(result).toContain(INVALID_OP_PATH)
  expect(result).toContain('Please verify it exists and try again.')
})

test('publish should error out if no image is given for a brand new ops.yml', async () => {
  await run(
    ['init'],
    [
      ENTER,
      INVALID_COMMAND_NAME,
      ENTER,
      INVALID_COMMAND_DESCRIPTION,
      ENTER,
      ENTER,
    ],
  )

  const result = await run(
    ['publish', INVALID_COMMAND_NAME],
    [ENTER, ENTER, INVALID_COMMAND_PUBLISH_DESCRIPTION, ENTER],
  )
  expect(result).toContain("✋ We couldn't find an image for")
  expect(result).toContain(INVALID_COMMAND_NAME)
  expect(result).toContain('⚙️  Please build this op for')
  expect(result).toContain(EXISTING_USER_NAME)
  expect(result).toContain('$ ops build')
})
