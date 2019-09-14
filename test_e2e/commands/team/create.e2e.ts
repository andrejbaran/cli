/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 11th June 2019 6:30:38 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Thursday, 12th September 2019 11:21:56 am
 * @copyright (c) 2019 CTO.ai
 */

import { run, sleep, cleanup, signin } from '../../utils/cmd'
import {
  ENTER,
  getValidTeamName,
  INVALID_TEAM_NAME,
} from '../../utils/constants'

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 3

beforeEach(async () => {
  await run(['account:signout'])
})

afterAll(async () => {
  // avoid jest open handle error
  await cleanup()
  await sleep(500)
})

test('it should create a new team by prompting for a team name', async () => {
  console.log('it should create a new team by prompting for a team name')

  await signin()
  await sleep(500)

  // const result = await run(['whoami'])

  const result = await run(['team:create'], [getValidTeamName(), ENTER])
  expect(result).toContain('team has been created')
})

test('it should create a new team when name flag set', async () => {
  console.log('it should create a new team when name flag set')
  await signin()
  const result = await run(['team:create', '-n', getValidTeamName()])
  expect(result).toContain('team has been created')
})

test('it should fail to create a new team when prompted with an invalid name', async () => {
  console.log(
    'it should fail to create a new team when prompted with an invalid name',
  )
  await signin()
  const result = await run(['team:create'], [INVALID_TEAM_NAME, ENTER])
  expect(result).toContain('Invalid team name')
})

test('it should fail to create a new team when flag is set to invalid name', async () => {
  console.log(
    'it should fail to create a new team when flag is set to invalid name',
  )
  await signin()
  const result = await run(['team:create', '-n', INVALID_TEAM_NAME])
  expect(result).toContain('invalid team name')
})
