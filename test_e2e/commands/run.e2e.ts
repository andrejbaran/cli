/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 11th June 2019 6:30:38 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 12th June 2019 1:28:06 pm
 * @copyright (c) 2019 CTO.ai
 */

import fs from 'fs-extra'
import path from 'path'
import { run, signin, sleep } from '../utils/cmd'
import {
  EXISTING_USER_EMAIL,
  EXISTING_USER_PASSWORD,
  EXISTING_OP_NAME,
  NEW_FILE,
} from '../utils/constants'

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 3

beforeEach(async () => {
  try {
    await run(['account:signout'])
  } catch (err) {
    throw err
  }
})

afterAll(async () => {
  // avoid jest open handle error
  await sleep(500)
})

test('it should signin, run existing op', async () => {
  console.log('it should signin, run existing op')
  await signin(EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD)
  await sleep(500)

  console.log(`ops run ${EXISTING_OP_NAME}`)
  try {
    const pathToExistingOp = path.join(__dirname, '../', EXISTING_OP_NAME)

    const result = await run(['run', pathToExistingOp])
    // await sleep(6500)

    expect(result).toContain(`Running ${EXISTING_OP_NAME}...`)
    const newFile = path.join(process.cwd(), NEW_FILE)
    const newFileExists = fs.existsSync(newFile)
    console.log('newfile', newFile, newFileExists)
    expect(newFileExists).toBeTruthy()

    if (newFileExists) {
      fs.unlinkSync(newFile)
    }
    await sleep(500)
  } catch (error) {
    throw error
  }

  await sleep(500)
})

test('it should true', async () => {
  expect(true).toBe(true)
})
