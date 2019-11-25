/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Friday, 24th May 2019 1:41:52 pm
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Wednesday, 20th November 2019 11:50:04 am
 * @copyright (c) 2019 CTO.ai
 */

import fs from 'fs-extra'
import * as yaml from 'yaml'
import * as path from 'path'
import { run, signin, sleep, cleanup } from '../utils/cmd'
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
  UP,
  Y,
  OP_TO_ADD,
} from '../utils/constants'
import { COMMAND, WORKFLOW } from '~/constants/opConfig'

// give the suite max 5 minutes to complete
jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 5

beforeEach(async () => {
  await run(['account:signout'])
})

afterEach(async () => {
  // avoid jest open handle error
  await cleanup()
  await sleep(500)
})

test('it should init a command, build, publish, list, remove', async () => {
  await signin()
  await sleep(500)

  console.log('ops init a command')
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

  await sleep(500)

  console.log(`ops build ${NEW_COMMAND_NAME}`)
  const buildRes = await run(['build', NEW_COMMAND_NAME])
  expect(buildRes.toLowerCase()).toContain('successfully built')

  await sleep(500)

  console.log(`ops publish ${NEW_COMMAND_NAME}`)
  const publishRes = await run(
    ['publish', NEW_COMMAND_NAME],
    [ENTER, ENTER, NEW_COMMAND_PUBLISH_DESCRIPTION, ENTER, ENTER],
  )
  expect(publishRes.toLowerCase()).toContain('preparing:')
  expect(publishRes).toContain('has been published!')
  await sleep(1000)

  console.log('ops list')
  // Going 'two downs' because there are two ops in sample ops directory already published by the existing_user team
  // The command with name NEW_COMMAND_NAME is the third op in the list
  const listRes = await run(['list'], [DOWN, DOWN, ENTER])
  await sleep(500)

  expect(listRes).toContain(NEW_COMMAND_NAME)
  await sleep(500)

  console.log(`ops remove ${NEW_COMMAND_NAME}`)
  // ENTER, ENTER doesn't work for some reason
  const removeRes = await run(
    ['remove', `${NEW_COMMAND_NAME}:${NEW_COMMAND_VERSION}`],
    [NEW_COMMAND_REMOVE_DESCRIPTION, ENTER, Y, ENTER],
  )
  expect(removeRes).toContain(
    `${NEW_COMMAND_NAME}:${NEW_COMMAND_VERSION} has been removed from the registry!`,
  )
  await sleep(500)

  const pathToOp = `./${NEW_COMMAND_NAME}`

  if (fs.existsSync(pathToOp)) {
    fs.removeSync(pathToOp)
    console.log(pathToOp, ' directory deleted successfully.')
  }
})

test('it should init a workflow, publish, list, remove', async () => {
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

  console.log(`ops publish ${NEW_WORKFLOW_NAME}`)
  const publishRes = await run(
    ['publish', NEW_WORKFLOW_NAME],
    [DOWN, ENTER, ENTER, NEW_WORKFLOW_PUBLISH_DESCRIPTION, ENTER],
  )

  expect(publishRes).toContain(`${NEW_WORKFLOW_NAME} has been published!`)
  await sleep(1000)

  console.log('ops list')
  const listRes = await run(['list'], [ENTER])
  expect(listRes).toContain(NEW_WORKFLOW_NAME)
  await sleep(500)

  console.log(`ops remove ${NEW_WORKFLOW_NAME}`)
  const removeRes = await run(
    ['remove', `${NEW_WORKFLOW_NAME}:${NEW_WORKFLOW_VERSION}`],
    [NEW_WORKFLOW_REMOVE_DESCRIPTION, ENTER, Y, ENTER],
  )

  expect(removeRes).toContain(
    `${NEW_WORKFLOW_NAME}:${NEW_WORKFLOW_VERSION} has been removed from the registry!`,
  )
  await sleep(500)

  const pathToWorkflow = `./${NEW_WORKFLOW_NAME}`

  if (fs.existsSync(pathToWorkflow)) {
    fs.removeSync(pathToWorkflow)
    console.log(pathToWorkflow, ' directory deleted successfully.')
  }
})

test('it should ops search, ops add, ops list', async () => {
  await signin()
  await sleep(500)

  console.log('ops list')
  const listRes = await run(['list'], [ENTER])
  expect(listRes).not.toContain(OP_TO_ADD)
  await sleep(500)

  console.log('ops search')
  const searchRes = await run(['search'], [ENTER])
  expect(searchRes).toContain(OP_TO_ADD)
  await sleep(500)

  console.log(`ops add ${OP_TO_ADD}`)
  const addRes = await run(['add'], [OP_TO_ADD])
  expect(addRes).toContain(
    `Good job! ${OP_TO_ADD} has been successfully added to your team.`,
  )
  await sleep(500)

  console.log('ops list')
  const listRes2 = await run(['list'], [ENTER])
  expect(listRes2).toContain(OP_TO_ADD)
  await sleep(500)
})

test.only('it be able to publish multiple versions of an op', async () => {
  await signin()
  await sleep(500)

  console.log('ops init a command')
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
    3000,
  )
  expect(initRes.toLowerCase()).toContain('success')
  expect(initRes.toLowerCase()).toContain('to test your workflow run:')

  await sleep(500)

  console.log(`ops publish ${NEW_WORKFLOW_NAME}`)
  const publishRes = await run(
    ['publish', NEW_WORKFLOW_NAME],
    [DOWN, ENTER, ENTER, NEW_WORKFLOW_PUBLISH_DESCRIPTION, ENTER],
  )
  expect(publishRes.toLowerCase()).toContain(`has been published!`)
  expect(publishRes.toLowerCase()).toContain('visit your op page here:')

  await sleep(500)
  const manifest = fs.readFileSync(`${NEW_WORKFLOW_NAME}/ops.yml`, 'utf8')
  const parsedYaml = yaml.parseDocument(manifest)
  parsedYaml
    // @ts-ignore
    .getIn(['workflows', 0])
    .set('name', `${NEW_WORKFLOW_NAME}:newversion`)
  const parsedYamlString = parsedYaml.toString()
  fs.writeFileSync(`${NEW_WORKFLOW_NAME}/ops.yml`, parsedYamlString)

  await sleep(500)
  console.log(`ops publish ${NEW_WORKFLOW_NAME}:newversion`)
  const publishResNewVersion = await run(
    ['publish', NEW_WORKFLOW_NAME],
    [DOWN, ENTER, ENTER, NEW_WORKFLOW_PUBLISH_DESCRIPTION, ENTER],
  )
  expect(publishResNewVersion.toLowerCase()).toContain(`has been published!`)
  expect(publishResNewVersion.toLowerCase()).toContain(
    'visit your op page here:',
  )
})
