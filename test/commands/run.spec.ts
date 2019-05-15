/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Monday, 6th May 2019 11:06:29 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Tuesday, 14th May 2019 11:54:10 am
 * @copyright (c) 2019 CTO.ai
 */

import * as Config from '@oclif/config'
import Run from '~/commands/run'

import { defaultApiHost } from '~/constants/env'

let cmd: Run

/*
 * reference https://github.com/oclif/command/blob/master/src/command.ts
 * https://github.com/oclif/config/blob/master/src/plugin.ts *
 */
beforeAll(async () => {
  jest.mock('~/commands/run')
  const config = await Config.load()
  cmd = new Run([], config)
})

test.skip('setEnvs should override default envs with process.env values', () => {
  // accessToken in config.json should be overriden by process.env access token
  const accessToken = '2222222222'

  const fakeAccessToken = '123456789'
  const fakeApiPath = '/test/path'
  const fakeNodeEnv = 'production'
  const fakeBool = 'false'
  const fakeUser = 'frank'
  const fakeApiHost = 'http://localhost:3030/'

  const opsYamlEnv = [
    `USER=${fakeUser}`,
    'LOGGER_PLUGINS_STDOUT_ENABLED=true',
    'OPS_ACCESS_TOKEN',
  ]

  const processEnv = {
    NODE_ENV: fakeNodeEnv,
    LOGGER_PLUGINS_STDOUT_ENABLED: fakeBool,
    OPS_ACCESS_TOKEN: fakeAccessToken,
    OPS_API_PATH: fakeApiPath,
    OPS_API_HOST: fakeApiHost,
    USELESS_ENV: 'uselessvalue',
  }

  // we are expecting
  const expected = [
    `NODE_ENV=${fakeNodeEnv}`,
    `LOGGER_PLUGINS_STDOUT_ENABLED=${fakeBool}`,
    `OPS_ACCESS_TOKEN=${fakeAccessToken}`,
    `OPS_API_PATH=${fakeApiPath}`,
    `OPS_API_HOST=${fakeApiHost}`,
    `USER=${fakeUser}`,
  ]

  // @ts-ignore
  const received = cmd.setEnvs(processEnv)({
    op: { env: opsYamlEnv },
    config: { accessToken },
  })

  expect(received.op.env).toStrictEqual(expected)
})

test.skip('setBinds should replace $HOME and ~ with home directory', () => {
  const home = process.env.HOME

  const expected = ['/tmp:/tmp', `${home}/.aws:/.aws`, `${home}/.ssh:/mnt/.ssh`]

  // @ts-ignore
  const received = cmd.setBinds({
    op: {
      bind: ['/tmp:/tmp', '$HOME/.aws:/.aws', '~/.ssh:/mnt/.ssh'],
    },
  })

  expect(received.op.env).toStrictEqual(expected)
})

// test('user should be prompted if they have not opted out of warnings', () => {
//   const mockConfirm = jest.fn()
//   cmd._confirmHomeDirectoryBindMount = mockConfirm

//   cmd._doConfirmation(true)

//   expect(mockConfirm).toBeCalled()
// })

// test('user should not be prompted if they have opted out of warnings', () => {
//   const mockConfirm = jest.fn()
//   cmd._confirmHomeDirectoryBindMount = mockConfirm

//   cmd._doConfirmation(false)

//   expect(mockConfirm).not.toBeCalled()
// })
