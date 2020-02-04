import { ENTER, EXISTING_USER_NAME } from '../../utils/constants'
import { run, signin, signout, sleep } from '../../utils/cmd'

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 3

beforeEach(async () => {
  await signout()
  await signin()
  await sleep(500)
})

test('It should be able to set,list and delete a secret', async () => {
  console.log('ops set a secret in s3')

  const key = 'testabc'
  const value = 'testme'

  const setRes = await run(
    ['secrets:set'],
    [key, ENTER, value, ENTER, value, ENTER],
    3000,
  )
  expect(setRes.toLowerCase()).toContain(
    `secret ${key} has been added to your team`,
  )
  console.log('ops list secrets in s3')

  const listRes = await run(['secrets:list'], [key, ENTER, ENTER], 3000)

  expect(listRes.toLowerCase()).toContain(
    `listing all secrets for team ${EXISTING_USER_NAME}`,
  )
  expect(listRes.toLowerCase()).toContain(`default storage`)
  expect(listRes.toLowerCase()).toContain(`${key}`)

  console.log('ops delete a secret in s3')

  const deleteRes = await run(['secrets:delete'], [key, ENTER, ENTER], 3000)

  expect(deleteRes.toLowerCase()).toContain(
    `the secret ${key} has been deleted`,
  )

  console.log('ops list no secrets in s3')

  const listResNoSecrets = await run(['secrets:list'], [], 3000)

  expect(listResNoSecrets.toLowerCase()).toContain(
    `no secrets found for team ${EXISTING_USER_NAME} stored with default storage`,
  )
})
