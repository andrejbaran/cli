/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 11th June 2019 6:30:38 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 12th June 2019 11:51:18 am
 * @copyright (c) 2019 CTO.ai
 */

import { run, signin, sleep } from '../../utils/cmd'
import {
  getValidTeamName,
  EXISTING_USER_EMAIL,
  ENTER,
  EXISTING_USER_PASSWORD,
  INVALID_TEAM_NAME,
} from '../../utils/constants'

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 3

beforeEach(async () => {
  try {
    await run(['account:signout'])
  } catch (err) {
    console.error(err)
  }
})

afterAll(async () => {
  // avoid jest open handle error
  await sleep(500)
})

test('it should create a new team when prompting', async () => {
  console.log('it should create a new team by prompting')
  await signin(EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD)
  await sleep(500)

  try {
    const result = await run(['team:create'], [getValidTeamName(), ENTER])
    expect(result).toContain('team has been created')
  } catch (error) {
    console.error(error)
  }
})

test('it should create a new team when name flag set', async () => {
  console.log('it should create a new team when name flag set')
  await signin(EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD)
  await sleep(500)

  try {
    const result = await run(['team:create', '-n', getValidTeamName()])
    expect(result).toContain('team has been created')
  } catch (error) {
    console.error(error)
  }
})

test('it should fail to create a new team when prompted with an invalid name', async () => {
  console.log(
    'it should fail to create a new team when prompted with an invalid name',
  )
  await signin(EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD)
  await sleep(500)

  try {
    const result = await run(['team:create'], [INVALID_TEAM_NAME, ENTER])
    expect(result).toContain('Invalid team name')
  } catch (error) {
    console.error(error)
  }
})

test('it should fail to create a new team when flag is set to invalid name', async () => {
  console.log(
    'it should fail to create a new team when flag is set to invalid name',
  )
  await signin(EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD)
  await sleep(500)

  try {
    const result = await run(['team:create', '-n', INVALID_TEAM_NAME])
    expect(result).toContain('invalid team name')
  } catch (error) {
    console.error(error)
  }
})
