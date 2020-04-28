import {
  ENTER,
  ESCAPE,
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

test('It should be able to set,list and delete a secret', async () => {
  const key = 'testabc'
  const value = 'testme'

  const setRes = await run(
    ['secrets:set'],
    [key, ENTER, ENTER, 'i', value, ESCAPE, ':wq', ENTER],
  )
  expect(setRes.toLowerCase()).toContain(
    `secret ${key} has been added to your team`,
  )
  const listRes = await run(['secrets:list'], [key, ENTER, ENTER])

  expect(listRes.toLowerCase()).toContain(
    `listing all secrets for team ${EXISTING_USER_NAME}`,
  )
  expect(listRes.toLowerCase()).toContain(`default storage`)
  expect(listRes.toLowerCase()).toContain(`${key}`)

  const deleteRes = await run(['secrets:delete'], [key, ENTER, ENTER])

  expect(deleteRes.toLowerCase()).toContain(
    `the secret ${key} has been deleted`,
  )

  const listResNoSecrets = await run(['secrets:list'])

  expect(listResNoSecrets.toLowerCase()).toContain(
    `no secrets found for team ${EXISTING_USER_NAME} stored with default storage`,
  )
})
