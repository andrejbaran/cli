import * as OclifConfig from '@oclif/config'
import AccountSignin from '~/commands/account/signin'
import { KeycloakService } from '~/services/Keycloak'
import { Config, Services } from '~/types'
import { signinPrompts } from '~/commands/account/signin'
import { sleep } from '../../utils'

let cmd: AccountSignin
let config: OclifConfig.IConfig

beforeEach(async () => {
  config = await OclifConfig.load()
})

afterEach(async () => {
  // avoid jest open handle error
  await sleep(500)
})

describe('ops account:signin', () => {
  test('logMessages should log messages', async () => {
    cmd = new AccountSignin([], config)
    expect(cmd.logMessages()).toBe(undefined)
  })

  test('showWelcomeMessage', async () => {
    cmd = new AccountSignin([], config)

    const inputConfig = { user: { username: 'test-username' } } as Config
    expect(cmd.showWelcomeMessage(inputConfig)).toStrictEqual(inputConfig)
  })

  test('keycloakSignInFlow should call the keycloak service and expect tokens', async () => {
    const keycloakService = new KeycloakService()

    const fakeAccessToken = 'test-access-token'
    const fakeRefreshToken = 'test-refresh-token'
    const fakeIdToken = 'test-id-token'

    keycloakService.keycloakSignInFlow = jest.fn().mockResolvedValue({
      accessToken: fakeAccessToken,
      refreshToken: fakeRefreshToken,
      idToken: fakeIdToken,
      catch: jest.fn(),
    })

    cmd = new AccountSignin([], config, { keycloakService } as Services)

    const response = await cmd.keycloakSignInFlow()

    expect(response.accessToken).toEqual(fakeAccessToken)
    expect(response.refreshToken).toEqual(fakeRefreshToken)
    expect(response.idToken).toEqual(fakeIdToken)
  })

  test('getRefreshToken should call the keycloak service and receive tokens', async () => {
    const keycloakService = new KeycloakService()
    cmd = new AccountSignin([], config, { keycloakService } as Services)

    const expectedResponse = {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      idToken: 'test-id-token',
      sessionState: 'test-session-state',
    }

    keycloakService.getTokenFromPasswordGrant = jest
      .fn()
      .mockResolvedValue(expectedResponse)

    const userCredentials = {
      user: 'username',
      password: 'password',
    }

    const response = await cmd.getRefreshToken(userCredentials)

    expect(keycloakService.getTokenFromPasswordGrant).toBeCalledWith(
      userCredentials,
    )
    expect(response).toEqual(expectedResponse)
  })

  test('should use browser signin flow when no flags are passed', async () => {
    const keycloakService = new KeycloakService()
    keycloakService.init = jest.fn()

    cmd = new AccountSignin([], config, {
      keycloakService,
    } as Services)

    cmd.cliSigninPipeline = jest.fn()
    cmd.browserSigninPipeline = jest.fn()

    await cmd.run()

    expect(keycloakService.init).toHaveBeenCalledTimes(1)
    expect(cmd.cliSigninPipeline).not.toHaveBeenCalled()
    expect(cmd.browserSigninPipeline).toHaveBeenCalled()
  })

  test('should use cli signin flow when -u and -p flags are passed', async () => {
    const keycloakService = new KeycloakService()
    keycloakService.init = jest.fn()

    cmd = new AccountSignin(['-u', 'username', '-p', 'password'], config, {
      keycloakService,
    } as Services)

    const innerCliPipeline = jest.fn()
    cmd.cliSigninPipeline = jest.fn().mockReturnValue(innerCliPipeline)
    cmd.browserSigninPipeline = jest.fn()

    await cmd.run()
    expect(keycloakService.init).toHaveBeenCalledTimes(1)
    expect(cmd.cliSigninPipeline).toHaveBeenCalled()
    expect(innerCliPipeline).toHaveBeenCalled()
    expect(cmd.browserSigninPipeline).not.toHaveBeenCalled()
  })

  test('should use cli signin flow when -i flag passed', async () => {
    const keycloakService = new KeycloakService()
    keycloakService.init = jest.fn()

    cmd = new AccountSignin(['-i'], config, {
      keycloakService,
    } as Services)

    const innerCliPipeline = jest.fn()
    cmd.cliSigninPipeline = jest.fn().mockReturnValue(innerCliPipeline)
    cmd.browserSigninPipeline = jest.fn()

    await cmd.run()
    expect(keycloakService.init).toHaveBeenCalledTimes(1)
    expect(cmd.cliSigninPipeline).toHaveBeenCalled()
    expect(innerCliPipeline).toHaveBeenCalled()
    expect(cmd.browserSigninPipeline).not.toHaveBeenCalled()
  })

  test('determineQuestions should prompt for user and password if no flags passed', async () => {
    // it doesn't matter what flags we send because we're overriding them
    cmd = new AccountSignin([], config)

    // -i
    const flagsInteractive = { interactive: true }
    const resultInteractive = cmd.determineQuestions(
      signinPrompts,
      flagsInteractive,
    )()
    expect(resultInteractive).toEqual([
      signinPrompts.user,
      signinPrompts.password,
    ])
  })

  test('determineQuestions should prompt for password if user flag passed', async () => {
    cmd = new AccountSignin([], config)

    // -u
    const flagsNoPassword = { user: 'username' }
    const resultNoPassword = cmd.determineQuestions(
      signinPrompts,
      flagsNoPassword,
    )()
    expect(resultNoPassword).toEqual([signinPrompts.password])
  })

  test('determineQuestions should prompt for username if password flag passed', async () => {
    cmd = new AccountSignin([], config)

    // -p
    const flagsNoUser = { password: 'password' }
    const resultNoUser = cmd.determineQuestions(signinPrompts, flagsNoUser)()
    expect(resultNoUser).toMatchObject([signinPrompts.user])
  })

  test('determineQuestions should not prompt if username and password flags passed', async () => {
    cmd = new AccountSignin([], config)

    // -u & -p
    const flagsAll = { password: 'password', user: 'username' }
    const resultAll = cmd.determineQuestions(signinPrompts, flagsAll)()
    expect(resultAll).toEqual([])
  })

  test('determineUserCredentials should merge user and password flag data with zero prompted data', async () => {
    cmd = new AccountSignin([], config)

    // ops account:signin -u username -p password
    const flagsAll = { password: 'password', user: 'username' }
    const resultAll = cmd.determineUserCredentials(flagsAll)({})

    const expectedCredentials = { password: 'password', user: 'username' }
    expect(resultAll).toEqual(expectedCredentials)
  })

  test('determineUserCredentials should merge user flag data with prompted password data', async () => {
    cmd = new AccountSignin([], config)

    // ops account:signin -u
    const flags = { user: 'username' }
    const result = cmd.determineUserCredentials(flags)({
      password: 'password',
    })

    const expectedCredentials = { password: 'password', user: 'username' }
    expect(result).toEqual(expectedCredentials)
  })
})
