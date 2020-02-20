/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 11th June 2019 6:30:38 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Thursday, 12th September 2019 2:44:40 pm
 * @copyright (c) 2019 CTO.ai
 */

import * as OclifConfig from '@oclif/config'
import fs, { readJsonSync } from 'fs-extra'
import path from 'path'
import { run, signin, signout } from '../../utils/cmd'
import {
  EXISTING_USER_NAME,
  EXISTING_USER_EMAIL,
  EXISTING_USER_ID,
  EXISTING_TEAM_ID,
  EXISTING_USER_PASSWORD,
  ENTER,
  DEFAULT_TIMEOUT_INTERVAL,
} from '../../utils/constants'

jasmine.DEFAULT_TIMEOUT_INTERVAL = DEFAULT_TIMEOUT_INTERVAL

beforeEach(async () => {
  await signout()
})

test('it should signin via -u and -p flags and write the config file', async () => {
  const aString = expect.stringMatching(/\w*/)

  const desiredConfigObject = {
    user: {
      id: EXISTING_USER_ID,
      username: EXISTING_USER_NAME,
      email: EXISTING_USER_EMAIL,
    },
    team: {
      id: EXISTING_TEAM_ID,
      name: EXISTING_USER_NAME,
      createdBy: aString,
      createdAt: aString,
      updatedAt: aString,
    },
    tokens: {
      accessToken: aString,
      refreshToken: aString,
      idToken: aString,
      sessionState: aString,
    },
  }

  const result = await signin()

  const config = await OclifConfig.load()

  const configFileExists = fs.existsSync(config.configDir)
  const configData = readJsonSync(path.join(config.configDir, 'config.json'))

  expect(result).toContain(`Welcome back ${EXISTING_USER_NAME}`)
  expect(configFileExists).toBeTruthy()
  expect(configData).toMatchObject(desiredConfigObject)
})

test('it should signin via the -i flag and write the config file', async () => {
  const aString = expect.stringMatching(/\w*/)

  const desiredConfigObject = {
    user: {
      id: EXISTING_USER_ID,
      username: EXISTING_USER_NAME,
      email: EXISTING_USER_EMAIL,
    },
    team: {
      id: EXISTING_TEAM_ID,
      name: EXISTING_USER_NAME,
      createdBy: aString,
      createdAt: aString,
      updatedAt: aString,
    },
    tokens: {
      accessToken: aString,
      refreshToken: aString,
      idToken: aString,
      sessionState: aString,
    },
  }

  const result = await run(
    ['account:signin', '-i'],
    [EXISTING_USER_NAME, ENTER, EXISTING_USER_PASSWORD, ENTER],
  )
  const config = await OclifConfig.load()
  const configFileExists = fs.existsSync(config.configDir)
  const configData = readJsonSync(path.join(config.configDir, 'config.json'))

  expect(result).toContain(`Welcome back ${EXISTING_USER_NAME}`)
  expect(configFileExists).toBeTruthy()
  expect(configData).toMatchObject(desiredConfigObject)
})
