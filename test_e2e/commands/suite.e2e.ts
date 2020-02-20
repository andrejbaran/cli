/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Friday, 24th May 2019 1:41:52 pm
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Friday, 29th November 2019 2:26:52 pm
 * @copyright (c) 2019 CTO.ai
 */

import fs from 'fs-extra'
import * as yaml from 'yaml'
import { run, signin, cleanup, signout } from '../utils/cmd'
import {
  ENTER,
  NEW_COMMAND_DESCRIPTION,
  NEW_COMMAND_PUBLISH_DESCRIPTION,
  NEW_COMMAND_REMOVE_DESCRIPTION,
  NEW_COMMAND_NAME,
  NEW_COMMAND_VERSION,
  SPACE,
  DOWN,
  NEW_WORKFLOW_NAME,
  NEW_WORKFLOW_DESCRIPTION,
  NEW_WORKFLOW_PUBLISH_DESCRIPTION,
  NEW_WORKFLOW_REMOVE_DESCRIPTION,
  NEW_WORKFLOW_VERSION,
  Y,
  OP_TO_ADD,
  DEFAULT_TIMEOUT_INTERVAL,
  UP,
} from '../utils/constants'
import { COMMAND, WORKFLOW } from '~/constants/opConfig'
import { sleep } from '../../test/utils'

jasmine.DEFAULT_TIMEOUT_INTERVAL = DEFAULT_TIMEOUT_INTERVAL

const pathToWorkflow = `./${NEW_WORKFLOW_NAME}`
const pathToCommand = `./${NEW_COMMAND_NAME}`

beforeEach(async () => {
  await signin()
})

afterEach(async () => {
  await signout()
  await cleanup()
  if (fs.existsSync(pathToWorkflow)) fs.removeSync(pathToWorkflow)
  if (fs.existsSync(pathToCommand)) fs.removeSync(pathToCommand)
})

test('it should init a command, build, publish, list, remove', async () => {
  const initRes = await run(
    ['init'],
    [
      SPACE,
      ENTER,
      NEW_COMMAND_NAME,
      ENTER,
      NEW_COMMAND_DESCRIPTION,
      ENTER,
      ENTER,
    ],
  )
  expect(initRes.toLowerCase()).toContain('success!')
  expect(initRes.toLowerCase()).toContain(
    `to test your ${COMMAND} run: $ ops run ${NEW_COMMAND_NAME}`,
  )
  const buildRes = await run(['build', NEW_COMMAND_NAME])
  expect(buildRes.toLowerCase()).toContain('successfully built')

  const publishRes = await run(
    ['publish', NEW_COMMAND_NAME],
    [NEW_COMMAND_PUBLISH_DESCRIPTION, ENTER],
  )
  expect(publishRes.toLowerCase()).toContain('preparing:')
  expect(publishRes).toContain('has been published!')

  await sleep(1000)

  const listRes = await run(['list'], [DOWN, ENTER])
  expect(listRes).toContain(NEW_COMMAND_NAME)

  const removeRes = await run(
    ['remove', `${NEW_COMMAND_NAME}:${NEW_COMMAND_VERSION}`],
    [NEW_COMMAND_REMOVE_DESCRIPTION, ENTER, Y, ENTER],
  )
  expect(removeRes).toContain(
    `${NEW_COMMAND_NAME}:${NEW_COMMAND_VERSION} has been successfully removed`,
  )
})

test('it should init a workflow, publish, list, remove', async () => {
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

  const publishRes = await run(
    ['publish', NEW_WORKFLOW_NAME],
    [NEW_WORKFLOW_PUBLISH_DESCRIPTION, ENTER],
  )
  expect(publishRes).toContain(`${NEW_WORKFLOW_NAME} has been published!`)

  await sleep(1000)

  const listRes = await run(['list'], [UP, ENTER])
  expect(listRes).toContain(NEW_WORKFLOW_NAME)

  const removeRes = await run(
    ['remove', `${NEW_WORKFLOW_NAME}:${NEW_WORKFLOW_VERSION}`],
    [NEW_WORKFLOW_REMOVE_DESCRIPTION, ENTER, Y, ENTER],
  )
  expect(removeRes).toContain(
    `${NEW_WORKFLOW_NAME}:${NEW_WORKFLOW_VERSION} has been successfully removed`,
  )
})

test('it should ops add, ops list, ops remove added_op, ops list', async () => {
  const listRes = await run(['list'], [ENTER])
  expect(listRes).not.toContain(OP_TO_ADD)

  const addRes = await run(['add'], [`${OP_TO_ADD}:latest`])
  expect(addRes).toContain(`has been successfully added to your team.`)

  const listRes2 = await run(['list'], [ENTER])
  expect(listRes2).toContain(OP_TO_ADD)

  const removeRes = await run(['remove', `${OP_TO_ADD}:latest`], [Y, ENTER])
  expect(removeRes).toContain(`has been successfully removed`)

  const listRes3 = await run(['list'], [ENTER])
  expect(listRes3).not.toContain(OP_TO_ADD)
})

test('it be able to publish multiple versions of an op', async () => {
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
  expect(initRes.toLowerCase()).toContain('success')
  expect(initRes.toLowerCase()).toContain('to test your workflow run:')

  const publishRes = await run(
    ['publish', NEW_WORKFLOW_NAME],
    [NEW_WORKFLOW_PUBLISH_DESCRIPTION, ENTER],
  )
  expect(publishRes.toLowerCase()).toContain(`has been published!`)
  expect(publishRes.toLowerCase()).toContain('visit your op page here:')

  const manifest = fs.readFileSync(`${NEW_WORKFLOW_NAME}/ops.yml`, 'utf8')
  const parsedYaml = yaml.parseDocument(manifest)
  parsedYaml
    // @ts-ignore
    .getIn(['workflows', 0])
    .set('name', `${NEW_WORKFLOW_NAME}:newversion`)
  const parsedYamlString = parsedYaml.toString()
  fs.writeFileSync(`${NEW_WORKFLOW_NAME}/ops.yml`, parsedYamlString)

  const publishResNewVersion = await run(
    ['publish', NEW_WORKFLOW_NAME],
    [NEW_WORKFLOW_PUBLISH_DESCRIPTION, ENTER],
  )
  expect(publishResNewVersion.toLowerCase()).toContain(`has been published!`)
  expect(publishResNewVersion.toLowerCase()).toContain(
    'visit your op page here:',
  )
})
