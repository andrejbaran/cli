import { run, signin, signout, cleanup } from '../utils/cmd'
import {
  ENTER,
  SPACE,
  DOWN,
  NEW_WORKFLOW_NAME,
  NEW_WORKFLOW_DESCRIPTION,
  NEW_WORKFLOW_VERSION,
  DEFAULT_TIMEOUT_INTERVAL,
} from '../utils/constants'
import { WORKFLOW } from '~/constants/opConfig'
import fs from 'fs-extra'

jasmine.DEFAULT_TIMEOUT_INTERVAL = DEFAULT_TIMEOUT_INTERVAL

const pathToWorkflow = `./${NEW_WORKFLOW_NAME}`

beforeEach(async () => {
  await signin()
})

afterEach(async () => {
  await signout()
  if (fs.existsSync(pathToWorkflow)) {
    fs.removeSync(pathToWorkflow)
  }
})

afterAll(async () => {
  await cleanup()
})

test('init should create a directory with the command name', async () => {
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

  const packageObj = fs.readFileSync(`${pathToWorkflow}/ops.yml`, 'utf8')

  const WF_VERSIONS = (
    NEW_WORKFLOW_NAME +
    ':' +
    NEW_WORKFLOW_VERSION
  ).toLowerCase()

  expect(packageObj).toContain(WF_VERSIONS)
})
