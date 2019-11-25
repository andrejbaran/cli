import { run, signin, sleep, cleanup } from '../utils/cmd'
jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 3

beforeEach(async () => {
  try {
    await run(['account:signout'])
  } catch (err) {
    throw err
  }
})

afterAll(async () => {
  await cleanup()
  // avoid jest open handle error
  await sleep(500)
})

test(`it should be able to show the list of all public commands and workflows`, async () => {
  await signin()
  await sleep(500)

  console.log(`ops search`)

  const result = await run(['search'])
  expect(result).toContain(`Searching all commands and workflows`)
})

test(`it asserts that op version is never undefined`, async () => {
  await signin()
  await sleep(500)

  console.log(`ops search`)

  const result = await run(['search'])

  // asserts that version is not undefined
  expect(result).not.toContain('(undefined)')
})
