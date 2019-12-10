/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 11th June 2019 6:30:38 pm
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Monday, 21st October 2019 10:07:14 am
 * @copyright (c) 2019 CTO.ai
 */

import fs from 'fs-extra'
import path from 'path'
import { run, signin, signout, sleep, cleanup } from '../utils/cmd'
import {
  DOWN,
  ENTER,
  EXISTING_OP_NAME,
  NEW_FILE,
  EXISTING_WORKFLOW_NAME,
  SPACE,
  NEW_WORKFLOW_NAME,
  NEW_WORKFLOW_DESCRIPTION,
  NEW_WORKFLOW_VERSION,
  EXISTING_USER_NAME,
  PUBLIC_TEAM_NAME,
  PUBLIC_COMMAND_NAME,
  GITHUB_ACCESS_TOKEN,
} from '../utils/constants'

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 3

beforeEach(async () => {
  await signout()
})

afterEach(async () => {
  await sleep(500)
})

test('it should run a published op by passing name as argument', async () => {
  console.log('it should run a published op by passing name as argument')

  await signin()
  await sleep(500)

  console.log(`ops run ${EXISTING_OP_NAME}`)
  const result = await run(['run', EXISTING_OP_NAME])
  expect(result).toContain(`Running ${EXISTING_OP_NAME}...`)

  const newFile = path.join(process.cwd(), NEW_FILE)
  await sleep(500)
  const newFileExists = fs.existsSync(newFile)
  console.log('newfile', newFile, newFileExists)
  expect(newFileExists).toBeTruthy()

  if (newFileExists) {
    fs.unlinkSync(newFile)
  }
})

test('it should run a published workflow by passing name as argument', async () => {
  console.log('it should run a published workflow by passing name as argument')
  await signin()
  await sleep(500)

  console.log(`ops run ${EXISTING_WORKFLOW_NAME}`)
  const result = await run(['run', EXISTING_WORKFLOW_NAME])
  expect(result).toContain('Running echo hello 1')
  expect(result).toContain('Running echo hello 2')
  expect(result).toContain('Running echo hello 3')
  expect(result).toContain(
    `Workflow ${EXISTING_WORKFLOW_NAME} completed successfully.`,
  )
})

test('it should run a local op by passing path as argument', async () => {
  console.log('it should run a local op by passing path as argument')

  await signin()
  await sleep(500)

  const pathToExistingOp = path.join(
    __dirname,
    '../sample_ops',
    EXISTING_OP_NAME,
  )

  console.log(`ops run ${pathToExistingOp}`)
  const result = await run(['run', pathToExistingOp], ['write', ENTER])

  expect(result).toContain(`Running ${EXISTING_OP_NAME}...`)
  const newFile = path.join(process.cwd(), NEW_FILE)
  const newFileExists = fs.existsSync(newFile)
  console.log('newfile', newFile, newFileExists)
  expect(newFileExists).toBeTruthy()

  if (newFileExists) {
    fs.unlinkSync(newFile)
  }
})

test('it should run a local workflow by passing path as argument', async () => {
  console.log('it should run a local workflow by passing path as argument')
  await signin()
  await sleep(500)

  console.log(`ops run ${EXISTING_WORKFLOW_NAME}`)
  const pathToExistingWorkflow = path.join(
    __dirname,
    '../sample_ops',
    EXISTING_WORKFLOW_NAME,
  )

  console.log(`ops run ${pathToExistingWorkflow}`)
  const result = await run(['run', pathToExistingWorkflow], [DOWN, ENTER])
  expect(result).toContain('Running echo hello 1')
  expect(result).toContain('Running echo hello 2')
  expect(result).toContain('Running echo hello 3')
  expect(result).toContain(
    `Workflow ${EXISTING_WORKFLOW_NAME} completed successfully.`,
  )
})

test('it should init a local workflow then run it unpublished', async () => {
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
      ENTER,
    ],
  )
  expect(initRes.toLowerCase()).toContain('success!')
  expect(initRes).toContain(`🚀 To test your ${WORKFLOW} run:`)
  expect(initRes).toContain(
    `cd ${NEW_WORKFLOW_NAME} && npm install && ops run .`,
  )

  await sleep(500)

  console.log(`ops run ${NEW_WORKFLOW_NAME}`)
  const result = await run(['run', NEW_WORKFLOW_NAME], [ENTER])

  expect(result).toContain(
    `Workflow ${NEW_WORKFLOW_NAME} completed successfully.`,
  )

  await sleep(500)

  const pathToWorkflow = `./${NEW_WORKFLOW_NAME}`

  if (fs.existsSync(pathToWorkflow)) {
    fs.removeSync(pathToWorkflow)
    console.log(pathToWorkflow, ' directory deleted successfully.')
  }
})

test('it should run a public command by exact match', async () => {
  await signin()
  await sleep(500)

  console.log(`ops run @${PUBLIC_TEAM_NAME}/${PUBLIC_COMMAND_NAME}`)

  const result = await run(
    ['run', `@${PUBLIC_TEAM_NAME}/${PUBLIC_COMMAND_NAME}`],
    [ENTER, GITHUB_ACCESS_TOKEN, ENTER],
    2000,
  )

  expect(result).toContain(`Running ${PUBLIC_COMMAND_NAME}`)

  await sleep(500)
})

test('it should be able to run a WF with JS as a step', async () => {
  await signin()
  await sleep(500)

  console.log('ops init a workflow, and write basic JS as step')
  await run(
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
  const pathToWorkflow = `./${NEW_WORKFLOW_NAME}`
  const newOpsString = `# for more info visit https://cto.ai/docs/ops-reference
  version: "1"
  workflows:
    - name: # Unique identifier for your workflow (required)
        t_workflow_e2e_test:0.1.0
      description: t_workflow_e2e_test description
      public: false
      sourceCodeURL: ""
      remote: true
      steps:
        - console.log('Hello World !)
      env:
        - "MY_ENV_VAR=$MY_ENV_VAR"
        - "MY_ACCESS_TOKEN=$MY_ACCESS_TOKEN"`

  fs.writeFileSync(`${pathToWorkflow}/ops.yml`, newOpsString)

  await run(
    ['publish', NEW_WORKFLOW_NAME],
    [DOWN, ENTER, ENTER, NEW_WORKFLOW_DESCRIPTION, ENTER],
  )

  const result = await run(['run', `@existing_user/${NEW_WORKFLOW_NAME}`])
  expect(result).toContain('Running gluecode')
  expect(result).toContain(
    `Workflow ${NEW_WORKFLOW_NAME} completed successfully.`,
  )

  if (fs.existsSync(pathToWorkflow)) {
    fs.removeSync(pathToWorkflow)
    console.log(pathToWorkflow, ' directory deleted successfully.')
  }
  await cleanup()
})
