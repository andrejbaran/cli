/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 11th June 2019 6:30:38 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Tuesday, 17th September 2019 5:41:40 pm
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
  SPACE,
  NEW_WORKFLOW_NAME,
  NEW_WORKFLOW_DESCRIPTION,
  EXISTING_USER_NAME,
} from '../utils/constants'
import { WORKFLOW } from '~/constants/opConfig'
import { exec } from 'child_process'

import * as util from 'util'

export const execPromisified = util.promisify(exec)

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 3

beforeEach(async () => {
  await signout()
})

afterEach(async () => {
  await sleep(500)
})

test('it should run existing op', async () => {
  console.log('it run existing op')
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

test('it should run existing workflow', async () => {
  console.log('it run existing workflow')
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

test('it should init a local workflow and run it unpublished', async () => {
  await signin()
  await sleep(500)

  console.log('ops init a workflow')
  const initRes = await run(
    ['init'],
    [
      DOWN,
      SPACE,
      ENTER,
      NEW_WORKFLOW_NAME,
      ENTER,
      NEW_WORKFLOW_DESCRIPTION,
      ENTER,
    ],
  )
  expect(initRes.toLowerCase()).toContain('success!')
  expect(initRes).toContain(`🚀 To test your ${WORKFLOW} run:`)
  expect(initRes).toContain(`ops run ${NEW_WORKFLOW_NAME}`)

  await sleep(500)

  console.log(`ops run ${NEW_WORKFLOW_NAME}`)
  /*
   * by setting cwd here, we are simulating cd'ing into the directory: `cd
   * t_workflow_e2e_test && ops run t_workflow_e2e_test`
   */
  const result = await run(
    ['run', NEW_WORKFLOW_NAME],
    undefined,
    undefined,
    undefined,
    {
      cwd: NEW_WORKFLOW_NAME,
    },
  )
  /*
   * Note: the test output will say "workflow failed". That is expected due to us
   * exiting early.
   */
  expect(result).toContain('Welcome to the CTO.ai CLI SDK Demo')
  expect(result).toContain(`Hi, ${EXISTING_USER_NAME}!`)

  await sleep(500)

  const pathToWorkflow = `./${NEW_WORKFLOW_NAME}`

  if (fs.existsSync(pathToWorkflow)) {
    fs.removeSync(pathToWorkflow)
    console.log(pathToWorkflow, ' directory deleted successfully.')
  }
})
