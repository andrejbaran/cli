/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Friday, 24th May 2019 1:41:52 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 12th June 2019 4:58:08 pm
 * @copyright (c) 2019 CTO.ai
 */

import fs from 'fs-extra'
import { run, sleep, cleanup, signin, signup } from '../utils/cmd'
import {
  ENTER,
  SPACE,
  DOWN,
  NEW_OP_NAME,
  NEW_OP_DESCRIPTION,
  NEW_USER_EMAIL,
  NEW_USER_PASSWORD,
  NEW_USER_NAME,
  EXISTING_USER_EMAIL,
  EXISTING_USER_PASSWORD,
} from '../utils/constants'

// give the suite max 5 minutes to complete
jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 5

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

// test is redundant but useful for debugging
test.skip('it should signup', async () => {
  console.log('it should signup')
  const result = await signup(NEW_USER_EMAIL, NEW_USER_NAME, NEW_USER_PASSWORD)

  expect(result).toMatchSnapshot()
  await cleanup()
})

// test is redundant but useful for debugging
test.skip('it should signin', async () => {
  console.log('it should signin')
  const result = await signin(EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD)

  expect(result).toMatchSnapshot()
  expect(result).toContain('Welcome back')
})

test('it should signup, signin, init, build, publish, search', async () => {
  console.log('it should signup, signin, init, build, publish, search')

  await signup(NEW_USER_EMAIL, NEW_USER_NAME, NEW_USER_PASSWORD)
  await sleep(500)

  await signin(NEW_USER_EMAIL, NEW_USER_PASSWORD)
  await sleep(500)

  console.log('ops init')
  try {
    const initRes = await run(
      ['init'],
      [SPACE, ENTER, NEW_OP_NAME, ENTER, NEW_OP_DESCRIPTION, ENTER],
    )
    expect(initRes.toLowerCase()).toContain('success')
    expect(initRes).toContain('🚀 To test your op run: $ ops run t_my_new_op')
  } catch (e) {
    throw e
  }

  await sleep(500)

  console.log(`ops build ${NEW_OP_NAME}`)
  try {
    const buildRes = await run(['build', NEW_OP_NAME])
    expect(buildRes.toLowerCase()).toContain('successfully built')
  } catch (e) {
    throw e
  }

  await sleep(500)

  console.log(`ops publish ${NEW_OP_NAME}`)
  try {
    const publishRes = await run(['publish', NEW_OP_NAME])
    expect(publishRes.toLowerCase()).toContain('preparing:')
    expect(publishRes).toContain('has been published!')
  } catch (e) {
    throw e
  }
  await sleep(500)

  console.log('ops search')
  try {
    const searchRes = await run(['search'])
    await sleep(500)

    expect(searchRes).toContain(NEW_OP_NAME)
  } catch (e) {
    throw e
  }
  await sleep(500)

  const pathToOp = `./${NEW_OP_NAME}`

  if (fs.existsSync(pathToOp)) {
    fs.removeSync(pathToOp)
    console.log(pathToOp, ' directory deleted successfully.')
  }

  await cleanup()
})
