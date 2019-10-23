import AccountSupport from '~/commands/account/support'
import * as Config from '@oclif/config'
import { Services } from '~/types'
import { AnalyticsService } from '~/services/Analytics'
import { createMockUser, createMockTeam } from '../../mocks'

let cmd: AccountSupport
let config

beforeEach(async () => {
  config = await Config.load()
})

describe('accountSupport', () => {
  test('should log messages and track to analytics if logged in', async () => {
    const mockAnalyticsService = new AnalyticsService()
    mockAnalyticsService.track = jest.fn().mockReturnValue(true)

    cmd = new AccountSupport([], config, {
      analytics: mockAnalyticsService,
    } as Services)

    cmd.user = createMockUser({})
    cmd.team = createMockTeam({})
    cmd.isLoggedIn = jest.fn().mockReturnValue(null)
    cmd.log = jest.fn().mockReturnValue(null)

    await cmd.run()

    expect(cmd.isLoggedIn.mock.calls.length).toBe(1)
    expect(cmd.log.mock.calls.length).toBeGreaterThan(1)
    expect(mockAnalyticsService.track.mock.calls.length).toBe(1)
  })
})
