import * as OclifConfig from '@oclif/config'
import AccountSignin from '~/commands/account/signin'
import { KeycloakService } from '~/services/Keycloak'
import { Config, Services } from '~/types'

let cmd: AccountSignin
let config

beforeEach(async () => {
  config = await OclifConfig.load()
})

describe('ops account:signin tests', () => {
  test('account:signin.logMessages should log messages', async () => {
    cmd = new AccountSignin([], config)
    await expect(cmd.logMessages()).toBe(undefined)
  })

  test('account:signin.keycloakSignInFlow shoulud call the keycloak service and expect tokens', async () => {
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

  test('account:signin.showWelcomeMessage', async () => {
    cmd = new AccountSignin([], config)

    const inputConfig = { user: { username: 'test-username' } } as Config
    await expect(cmd.showWelcomeMessage(inputConfig)).toStrictEqual(inputConfig)
  })
})
