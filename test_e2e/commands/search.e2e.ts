import { run, signin, signout } from '../utils/cmd'
import { DEFAULT_TIMEOUT_INTERVAL } from '../utils/constants'
jasmine.DEFAULT_TIMEOUT_INTERVAL = DEFAULT_TIMEOUT_INTERVAL

beforeEach(async () => {
  await signin()
})

afterEach(async () => {
  await signout()
})

test(`it should be able to show the list of all public commands and workflows`, async () => {
  const result = await run(['search'])
  expect(result).toContain('Select a public')
  expect(result).toContain('to continue')
})

test(`it asserts that op version is never undefined`, async () => {
  const result = await run(['search'])
  expect(result).not.toContain('(undefined)')
})
