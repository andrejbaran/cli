import * as OclifConfig from '@oclif/config'
import AccountSignup from '~/commands/account/signup'
import { KeycloakService } from '~/services/Keycloak'
import { Config, Services } from '~/types'

let cmd: AccountSignup
let config

beforeEach(async () => {
  config = await OclifConfig.load()
})

describe('ops account:signin tests', () => {
  test('account:signin.logMessages should log messages', async () => {
    cmd = new AccountSignup([], config)
    await expect(cmd.logHelpMessage()).toBe(undefined)
  })

  test('account:signin.keycloakSignUpFlow shoulud call the keycloak service and expect tokens', async () => {
    const keycloakService = new KeycloakService()

    const fakeAccessToken = 'test-access-token'
    const fakeRefreshToken = 'test-refresh-token'
    const fakeIdToken = 'test-id-token'

    keycloakService.keycloakSignUpFlow = jest.fn().mockResolvedValue({
      accessToken: fakeAccessToken,
      refreshToken: fakeRefreshToken,
      idToken: fakeIdToken,
      catch: jest.fn(),
    })

    cmd = new AccountSignup([], config, { keycloakService } as Services)

    const response = await cmd.keycloakSignUpFlow()

    expect(response.accessToken).toEqual(fakeAccessToken)
    expect(response.refreshToken).toEqual(fakeRefreshToken)
    expect(response.idToken).toEqual(fakeIdToken)
  })
})
