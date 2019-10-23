import AccountReset from '~/commands/account/reset'
import * as Config from '@oclif/config'
import { KeycloakService } from '~/services/Keycloak'
import { createMockTokens, createMockUser, createMockTeam } from '../../mocks'
import { Services } from '~/types'
import { AnalyticsService } from '~/services/Analytics'

let cmd: AccountReset
let config

beforeEach(async () => {
  config = await Config.load()
})

describe('accountReset', () => {
  test('should make a call to the keycloak reset flow', async () => {
    const mockKeycloakService = new KeycloakService()
    mockKeycloakService.keycloakResetFlow = jest.fn().mockReturnValue(null)

    const mockAnalyticsService = new AnalyticsService()
    mockAnalyticsService.track = jest.fn().mockReturnValue(null)

    cmd = new AccountReset([], config, {
      keycloakService: mockKeycloakService,
      analytics: mockAnalyticsService,
    } as Services)

    cmd.user = createMockUser({})
    cmd.team = createMockTeam({})

    cmd.readConfig = jest.fn().mockReturnValue({
      tokens: createMockTokens({}),
    })

    cmd.isTokenValid = jest.fn().mockReturnValue(true)

    await cmd.run()

    expect(cmd.readConfig.mock.calls.length).toBe(1)
    expect(mockKeycloakService.keycloakResetFlow.mock.calls.length).toBe(1)
    expect(cmd.isTokenValid.mock.calls.length).toBe(1)
    expect(mockAnalyticsService.track.mock.calls.length).toBe(1)
  })

  test('should fail if keycloakresetflow returns an error', async () => {
    const mockKeycloakService = new KeycloakService()
    mockKeycloakService.keycloakResetFlow = jest.fn().mockRejectedValue(null)

    const mockAnalyticsService = new AnalyticsService()
    mockAnalyticsService.track = jest.fn().mockReturnValue(null)

    cmd = new AccountReset([], config, {
      keycloakService: mockKeycloakService,
    } as Services)

    cmd.user = createMockUser({})
    cmd.team = createMockTeam({})
    cmd.debug = jest.fn().mockReturnValue(null)
    cmd.config.runHook = jest.fn().mockReturnValue(null)

    cmd.readConfig = jest.fn().mockReturnValue({
      tokens: createMockTokens({}),
    })

    cmd.isTokenValid = jest.fn().mockReturnValue(true)

    await cmd.run()

    expect(cmd.readConfig.mock.calls.length).toBe(1)
    expect(mockKeycloakService.keycloakResetFlow.mock.calls.length).toBe(1)
    expect(cmd.isTokenValid.mock.calls.length).toBe(1)
    expect(mockAnalyticsService.track.mock.calls.length).toBe(0)
    expect(cmd.debug.mock.calls.length).toBe(1)
    expect(cmd.config.runHook.mock.calls.length).toBe(1)
  })
})
