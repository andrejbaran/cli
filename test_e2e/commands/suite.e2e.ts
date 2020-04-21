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
  DOWN,
  NEW_WORKFLOW_NAME,
  Y,
  OP_TO_ADD,
} from '../utils/constants'
import { sleep } from '../../test/utils'

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 5

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
    [ENTER, NEW_COMMAND_NAME, ENTER, NEW_COMMAND_DESCRIPTION, ENTER, ENTER],
  )
  expect(initRes.toLowerCase()).toContain('success!')
  expect(initRes.toLowerCase()).toContain(
    `to try out your op run: $ ops run ${NEW_COMMAND_NAME}`,
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
  let listRes
  for (let i = 0; i < 60; i++) {
    listRes = await run(['list'], [DOWN, ENTER])
    if (listRes.includes(NEW_COMMAND_NAME)) break
    await sleep(1000)
  }

  expect(listRes).toContain(NEW_COMMAND_NAME)

  const removeRes = await run(
    ['remove', `${NEW_COMMAND_NAME}:${NEW_COMMAND_VERSION}`],
    [NEW_COMMAND_REMOVE_DESCRIPTION, ENTER, Y, ENTER],
  )
  expect(removeRes).toContain(
    `${NEW_COMMAND_NAME}:${NEW_COMMAND_VERSION} has been successfully removed`,
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
    [ENTER, NEW_COMMAND_NAME, ENTER, NEW_COMMAND_DESCRIPTION, ENTER, ENTER],
  )
  expect(initRes.toLowerCase()).toContain('success')
  expect(initRes.toLowerCase()).toContain('to try out your op run:')

  const buildRes = await run(['build', NEW_COMMAND_NAME])
  expect(buildRes.toLowerCase()).toContain('successfully built')

  const publishRes = await run(
    ['publish', NEW_COMMAND_NAME],
    [NEW_COMMAND_PUBLISH_DESCRIPTION, ENTER],
  )
  expect(publishRes.toLowerCase()).toContain(`has been published!`)
  expect(publishRes.toLowerCase()).toContain('visit your op page here:')

  const manifest = fs.readFileSync(`${NEW_COMMAND_NAME}/ops.yml`, 'utf8')
  const parsedYaml = yaml.parseDocument(manifest)
  parsedYaml
    // @ts-ignore
    .getIn(['commands', 0])
    .set('name', `${NEW_COMMAND_NAME}:newversion`)
  const parsedYamlString = parsedYaml.toString()
  fs.writeFileSync(`${NEW_COMMAND_NAME}/ops.yml`, parsedYamlString)

  const buildResNewVersion = await run(['build', NEW_COMMAND_NAME])
  expect(buildResNewVersion.toLowerCase()).toContain('successfully built')

  const publishResNewVersion = await run(
    ['publish', NEW_COMMAND_NAME],
    [NEW_COMMAND_PUBLISH_DESCRIPTION, ENTER],
  )
  expect(publishResNewVersion.toLowerCase()).toContain(`has been published!`)
  expect(publishResNewVersion.toLowerCase()).toContain(
    'visit your op page here:',
  )
})
