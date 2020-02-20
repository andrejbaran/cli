/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 11th June 2019 6:30:38 pm
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Monday, 21st October 2019 10:06:32 am
 * @copyright (c) 2019 CTO.ai
 */

import { run, signin, signout } from '../utils/cmd'
import {
  EXISTING_USER_NAME,
  EXISTING_USER_EMAIL,
  DEFAULT_TIMEOUT_INTERVAL,
} from '../utils/constants'

jasmine.DEFAULT_TIMEOUT_INTERVAL = DEFAULT_TIMEOUT_INTERVAL

beforeEach(async () => {
  await signin()
})

afterEach(async () => {
  await signout()
})

test('it should signin, whoami', async () => {
  const result = await run(['whoami'])
  expect(result).toContain(`Email: ${EXISTING_USER_EMAIL}`)
  expect(result).toContain(`Username: ${EXISTING_USER_NAME}`)
  expect(result).toContain(`Team Name: ${EXISTING_USER_NAME}`)
})
