import { ENTER, SPACE, DOWN, Y } from '../../utils/constants'
import { run, signin, signout, sleep } from '../../utils/cmd'

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 3

beforeEach(async () => {
  await signout()
  await run(['secrets:unregister'], [ENTER], 3000) // To avoid making all tests fail if one of them is unable to unregister for some reason
})

afterAll(async () => {
  // avoid jest open handle error
  await sleep(500)
})

test('It should register a secret and be able to unregister', async () => {
  await signin()
  await sleep(500)

  console.log('ops register a secret')

  const secretStorageURL = 'https://testvault.cto.ai:8200/cicd'
  const accessToken = 's.VI2VPSg75nBtJMieFdCQ6F3A'

  const registerRes = await run(
    ['secrets:register'],
    [secretStorageURL, ENTER, accessToken, ENTER],
    3000,
  )

  expect(registerRes.toLowerCase()).toContain('secrets registration complete')

  console.log('ops unregister a secret')

  const unRegisterRes = await run(['secrets:unregister'], [Y, ENTER], 3000)

  expect(unRegisterRes.toLowerCase()).toContain(
    'the secret provider has been deleted from the team existing_user',
  )
})

test('It should be unable to register a secret twice and be able to unregister', async () => {
  await signin()
  await sleep(500)

  console.log('ops register a secret')

  const secretStorageURL = 'https://testvault.cto.ai:8200/cicd'
  const accessToken = 's.VI2VPSg75nBtJMieFdCQ6F3A'

  const registerRes = await run(
    ['secrets:register'],
    [secretStorageURL, ENTER, accessToken, ENTER],
    3000,
  )

  expect(registerRes.toLowerCase()).toContain('secrets registration complete')

  console.log('ops double register a secret provider error')

  const doubleRegisterRes = await run(['secrets:register'], undefined, 3000)

  expect(doubleRegisterRes.toLowerCase()).toContain(
    'looks like you already got a secrets provider for this team',
  )

  console.log('ops unregister a secret')

  const unRegisterRes = await run(['secrets:unregister'], [Y, ENTER], 3000)

  expect(unRegisterRes.toLowerCase()).toContain(
    'the secret provider has been deleted from the team existing_user',
  )
})

test('If an invalid vault location is given it should throw an error', async () => {
  await signin()
  await sleep(500)

  console.log('ops register an invalid secret URL')

  const secretStorageURL = 'invalidURL'
  const accessToken = 'invalidToken'

  const registerRes = await run(
    ['secrets:register'],
    [secretStorageURL, ENTER, accessToken, ENTER],
    3000,
  )

  expect(registerRes).toContain(
    ' It appears the vault URL that was specified is invalid',
  )
})

test('If an invalid token is given it should throw an error', async () => {
  await signin()
  await sleep(500)

  console.log('ops register an invalid vault token')

  const secretStorageURL = 'https://testvault.cto.ai:8200/cicd'
  const accessToken = 'invalidToken'

  const registerRes = await run(
    ['secrets:register'],
    [secretStorageURL, ENTER, accessToken, ENTER],
    3000,
  )

  expect(registerRes).toContain(
    'It looks like this token is not valid with the specified vault',
  )
})
