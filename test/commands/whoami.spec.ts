import * as Config from '@oclif/config'
import Whoami from '~/commands/whoami'
import { Services, OpsYml, Op, Config as ConfigType, Team } from '~/types'
import { sleep } from '../utils'
import { AnalyticsService } from '~/services/Analytics'
import {
  createMockTeam,
  createMockConfig,
  createMockTokens,
  createMockUser,
} from '../mocks'

let cmd: Whoami
let config: Config.IConfig

beforeEach(async () => {
  config = await Config.load()
})

afterEach(async () => {
  await sleep(500)
})

describe('testSendAnalytics', () => {
  test('Test if analytics are sent correctly', async () => {
    const mockAnalyticsService = new AnalyticsService()
    mockAnalyticsService.track = jest.fn().mockReturnValue(null)

    cmd = new Whoami([], config, {
      analytics: mockAnalyticsService,
    } as Services)

    cmd.readConfig = jest.fn().mockReturnValue({
      tokens: createMockTokens({}),
    })
    const mockTeam = createMockTeam({})
    const mockUser = createMockUser({
      id: 'FAKE_ID',
      username: 'FAKE_NAME',
      email: 'fake@email.com',
    })
    const mockConfig = createMockConfig({ user: mockUser, team: mockTeam })

    cmd.log = jest.fn().mockReturnValue(null)
    cmd.isLoggedIn = jest.fn().mockReturnValue(mockConfig)
    cmd.user = mockUser
    cmd.team = mockTeam

    await cmd.run()

    expect(mockAnalyticsService.track.mock.calls.length).toBe(1)
  })
})
