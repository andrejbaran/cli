/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 11th June 2019 6:30:38 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Thursday, 12th September 2019 2:48:14 pm
 * @copyright (c) 2019 CTO.ai
 */

import fs from 'fs-extra'
import path from 'path'
import { run, signin, signout, sleep } from '../utils/cmd'
import {
  DOWN,
  ENTER,
  EXISTING_OP_NAME,
  NEW_FILE,
  EXISTING_WORKFLOW_NAME,
} from '../utils/constants'

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 3

beforeEach(async () => {
  await signout()
})

afterEach(async () => {
  await sleep(500)
})

test('it should signin, run existing op', async () => {
  console.log('it should signin, run existing op')
  await signin()

  console.log(`ops run ${EXISTING_OP_NAME}`)
  const pathToExistingOp = path.join(
    __dirname,
    '../sample_ops',
    EXISTING_OP_NAME,
  )

  const result = await run(['run', pathToExistingOp], [DOWN, ENTER])

  expect(result).toContain(`Running ${EXISTING_OP_NAME}...`)
  const newFile = path.join(process.cwd(), NEW_FILE)
  const newFileExists = fs.existsSync(newFile)
  console.log('newfile', newFile, newFileExists)
  expect(newFileExists).toBeTruthy()

  if (newFileExists) {
    fs.unlinkSync(newFile)
  }
})

test('it should signin, run existing workflow', async () => {
  console.log('it should signin, run existing workflow')
  await signin()

  console.log(`ops run ${EXISTING_OP_NAME}`)
  const pathToExistingWorkflow = path.join(
    __dirname,
    '../sample_ops',
    EXISTING_WORKFLOW_NAME,
  )

  const result = await run(['run', pathToExistingWorkflow])
  expect(result).toContain('Running echo hello 1')
  expect(result).toContain('Running echo hello 2')
  expect(result).toContain('Running echo hello 3')
  expect(result).toContain(
    `Workflow ${EXISTING_WORKFLOW_NAME} completed successfully.`,
  )
})
