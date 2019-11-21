import { run, signin, signout, sleep } from '../utils/cmd'
import {
  ENTER,
  SPACE,
  DOWN,
  NEW_WORKFLOW_NAME,
  NEW_WORKFLOW_DESCRIPTION,
  NEW_WORKFLOW_VERSION,
} from '../utils/constants'
import { COMMAND, WORKFLOW } from '~/constants/opConfig'
import fs from 'fs-extra'
import * as yaml from 'yaml'
import path from 'path'

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 3

beforeEach(async () => {
  await signout()
})

afterEach(async () => {
  await sleep(500)
})

test('init should create a directory with the command name', async () => {
  await signin()
  await sleep(500)

  console.log('ops init a workflow, check if directory is created')
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
      NEW_WORKFLOW_VERSION,
      ENTER,
    ],
  )

  const newFileExists = fs.existsSync(NEW_WORKFLOW_NAME)
  expect(initRes.toLowerCase()).toContain('success!')
  expect(initRes).toContain(`🚀 To test your ${WORKFLOW} run:`)
  expect(newFileExists).toBeTruthy()

  const pathToWorkflow = `./${NEW_WORKFLOW_NAME}`
  const packageObj = fs.readFileSync(`${pathToWorkflow}/ops.yml`, 'utf8')

  console.log('check if correct version was assigned')
  const WF_VERSIONS = (
    NEW_WORKFLOW_NAME +
    ':' +
    NEW_WORKFLOW_VERSION
  ).toLowerCase()

  expect(packageObj).toContain(WF_VERSIONS)

  if (fs.existsSync(pathToWorkflow)) {
    fs.removeSync(pathToWorkflow)
    console.log(pathToWorkflow, ' directory deleted successfully.')
  }
})
