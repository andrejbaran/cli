/**
 * This test suite only tests error cases because of the pre-requisite of having a publishable op
 * and side-effect of needing to remove the docker image after.
 * The success functionality exists in the test suite, and thsi file only handles the error
 */

import fs from 'fs-extra'
import { run, signin, signout, sleep } from '../utils/cmd'
import {
  INVALID_OP_PATH,
  ENTER,
  DOWN,
  SPACE,
  INVALID_COMMAND_NAME,
  INVALID_COMMAND_DESCRIPTION,
  INVALID_COMMAND_PUBLISH_DESCRIPTION,
  EXISTING_USER_NAME,
} from '../utils/constants'

// give the suite max 5 minutes to complete
jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 5

beforeEach(async () => {
  await signout()
})

afterEach(async () => {
  await sleep(500)
})

test('publish should error out if no ops.yml is given', async () => {
  await signin()
  await sleep(500)

  const result = await run(['publish', INVALID_OP_PATH], [ENTER])
  expect(result).toContain(
    "🤔 Looks like the file ops.yml wasn't found in path:",
  )
  expect(result).toContain(INVALID_OP_PATH)
  expect(result).toContain('Please verify it exists and try again.')
})

test('publish should error out if no image is given for a brand new ops.yml', async () => {
  await signin()
  await sleep(500)

  await run(
    ['init'],
    [
      SPACE,
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

  if (fs.existsSync(INVALID_COMMAND_NAME)) {
    fs.removeSync(INVALID_COMMAND_NAME)
    console.log(INVALID_COMMAND_NAME, ' directory deleted successfully.')
  }
})
