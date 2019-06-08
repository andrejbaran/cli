/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Friday, 24th May 2019 1:41:52 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Friday, 7th June 2019 3:56:31 pm
 * @copyright (c) 2019 CTO.ai
 */

import fs from 'fs-extra'
import path from 'path'
import {
  run,
  sleep,
  cleanup,
  ENTER,
  NEW_OP_NAME,
  NEW_OP_DESCRIPTION,
  EXISTING_OP_NAME,
  NEW_USER_EMAIL,
  NEW_USER_PASSWORD,
  NEW_USER_NAME,
  EXISTING_USER_EMAIL,
  EXISTING_USER_PASSWORD,
  NEW_FILE,
} from '../utils/cmd'

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

const signup = async (email: string, name: string, password: string) => {
  try {
    return run(
      ['account:signup'],
      [email, ENTER, name, ENTER, password, ENTER, password, ENTER],
      1500,
    )
  } catch (e) {
    console.error('account:signup', e)
  }
}

const signin = async (email: string, password: string) => {
  try {
    return run(['account:signin'], [email, ENTER, password, ENTER], 1500)
  } catch (e) {
    console.error('account:signin', e)
  }
}

test('it should --help', async () => {
  try {
    console.log('it should --help')
    const result = await run(['--help'])
    expect(result).toContain('Manage your account settings.')
  } catch (error) {
    console.error(error)
  }
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

test('it should signup, signin, team:switch', async () => {
  console.log('it should signup, signin, team:switch')
  await signup(NEW_USER_EMAIL, NEW_USER_NAME, NEW_USER_PASSWORD)

  await signin(NEW_USER_EMAIL, NEW_USER_PASSWORD)

  try {
    const teamSwitchRes = await run(['team:switch'], [])

    expect(teamSwitchRes).toContain(`Here's the list of your teams`)
    expect(teamSwitchRes).toContain(NEW_USER_NAME)
  } catch (e) {
    console.error('team:switch', e)
  }
  await sleep(500)
  await cleanup()
})

test('it should signup, signin, init, build, publish, search', async () => {
  console.log('it should signup, signin, init, build, publish, search')

  await signup(NEW_USER_EMAIL, NEW_USER_NAME, NEW_USER_PASSWORD)

  await signin(NEW_USER_EMAIL, NEW_USER_PASSWORD)

  console.log('ops init')
  try {
    const initRes = await run(
      ['init'],
      [ENTER, NEW_OP_NAME, ENTER, NEW_OP_DESCRIPTION, ENTER],
    )
    expect(initRes).toMatchSnapshot()
  } catch (e) {
    console.error('init', e)
  }

  await sleep(500)

  console.log('ops build [name]')
  try {
    const buildRes = await run(['build', NEW_OP_NAME])
    expect(buildRes).toContain('Successfully built')
    expect(buildRes).toContain('Run $ ops publish')
  } catch (e) {
    console.error('build', e)
  }

  await sleep(500)

  console.log('ops publish [name]')
  try {
    const publishRes = await run(['publish', NEW_OP_NAME])
    expect(publishRes).toContain('Preparing:')
    expect(publishRes).toContain('has been published!')
  } catch (e) {
    console.error('publish', e)
  }
  await sleep(500)

  console.log('ops search')
  try {
    const searchRes = await run(['search'])
    expect(searchRes).toContain(NEW_OP_NAME)
  } catch (e) {
    console.error('publish', e)
  }
  await sleep(500)

  const pathToOp = `./${NEW_OP_NAME}`

  if (fs.existsSync(pathToOp)) {
    fs.removeSync(pathToOp)
    console.log(pathToOp, ' directory deleted successfully.')
  }

  await cleanup()
})

test('it should signin, run existing op', async () => {
  console.log('it should signin, run existing op')
  try {
    await run(
      ['account:signin'],
      [EXISTING_USER_EMAIL, ENTER, EXISTING_USER_PASSWORD, ENTER],
    )
  } catch (error) {
    console.error(error)
  }

  await sleep(500)

  console.log('ops run [name]')
  try {
    const pathToExistingOp = path.join(__dirname, '../', EXISTING_OP_NAME)

    const result = await run(['run', pathToExistingOp], [])
    expect(result).toContain(`Running ${EXISTING_OP_NAME}...`)

    const newFile = path.join(process.cwd(), NEW_FILE)
    const newFileExists = fs.existsSync(newFile)
    expect(newFileExists).toBeTruthy()
    if (newFileExists) {
      fs.unlinkSync(newFile)
    }
  } catch (error) {
    console.error(error)
  }

  await sleep(500)
})
