import {
  ENTER,
  EXISTING_USER_NAME,
  DEFAULT_TIMEOUT_INTERVAL,
} from '../../utils/constants'
import { run, signin, signout } from '../../utils/cmd'

jasmine.DEFAULT_TIMEOUT_INTERVAL = DEFAULT_TIMEOUT_INTERVAL

beforeEach(async () => {
  await signin()
})

afterEach(async () => {
  await signout()
})

test('It should be able to set,list and delete a config', async () => {
  const key = 'testabc'
  const value = 'testme'

  const setRes = await run(['configs:set', '-v', value], [key, ENTER])
  expect(setRes.toLowerCase()).toContain(
    `config ${key} has been added to your team`,
  )
  const listRes = await run(['configs:list'], [key, ENTER, ENTER])

  expect(listRes.toLowerCase()).toContain(
    `listing all configs for team ${EXISTING_USER_NAME}`,
  )
  expect(listRes.toLowerCase()).toContain(`${key}`)

  const deleteRes = await run(['configs:delete'], [key, ENTER, ENTER])

  expect(deleteRes.toLowerCase()).toContain(
    `the config ${key} has been deleted`,
  )

  const listResNoconfigs = await run(['configs:list'])

  expect(listResNoconfigs.toLowerCase()).toContain(
    `no configs found for team ${EXISTING_USER_NAME}.`,
  )
})
