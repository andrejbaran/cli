/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 11th June 2019 6:30:38 pm
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Friday, 18th October 2019 4:31:33 pm
 * @copyright (c) 2019 CTO.ai
 */

import { run, cleanup, signin, signout } from '../../utils/cmd'
import {
  ENTER,
  getValidTeamName,
  INVALID_TEAM_NAME,
  DEFAULT_TIMEOUT_INTERVAL,
} from '../../utils/constants'

jasmine.DEFAULT_TIMEOUT_INTERVAL = DEFAULT_TIMEOUT_INTERVAL

beforeEach(async () => {
  await signin()
})

afterEach(async () => {
  await signout()
})

afterAll(async () => {
  await cleanup()
})

test('it should create a new team by prompting for a team name', async () => {
  const result = await run(['team:create'], [getValidTeamName(), ENTER])
  expect(result).toContain('team has been created')
})

test('it should create a new team when name flag set', async () => {
  const result = await run(['team:create', '-n', getValidTeamName()])
  expect(result).toContain('team has been created')
})

test('it should fail to create a new team when prompted with an invalid name', async () => {
  const result = await run(['team:create'], [INVALID_TEAM_NAME, ENTER])
  expect(result).toContain('Invalid team name')
})

test('it should fail to create a new team when flag is set to invalid name', async () => {
  const result = await run(['team:create', '-n', INVALID_TEAM_NAME])
  expect(result).toContain('invalid team name')
})
