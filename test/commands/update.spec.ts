import * as Config from '@oclif/config'
import Update from '~/commands/update'
import { Services } from '~/types'
import { WORKFLOW } from '~/constants/opConfig'
import { AnalyticsService } from '~/services/Analytics'
import { ux } from '@cto.ai/sdk'

import { sleep } from '../utils'
import {
  createMockTeam,
  createMockConfig,
  createMockTokens,
  createMockUser,
} from '../mocks'

let cmd: Update

let config: Config.IConfig

beforeEach(async () => {
  config = await Config.load()
})

afterEach(async () => {
  await sleep(500)
})

describe('testSendAnalytics', () => {
  test('Test if analytics are sent correctly on run', async () => {
    const mockAnalyticsService = new AnalyticsService()
    mockAnalyticsService.track = jest.fn().mockReturnValue(null)

    const selectedTemplate = WORKFLOW

    ux.prompt = jest.fn().mockReturnValue({ template: selectedTemplate })

    cmd = new Update([], config, {
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

    cmd.askQuestion = jest.fn().mockReturnValue(true)
    cmd.updateVersion = jest.fn().mockReturnValue(false)
    cmd.log = jest.fn().mockReturnValue(null)
    cmd.isLoggedIn = jest.fn().mockReturnValue(mockConfig)
    cmd.user = mockUser
    cmd.team = mockTeam
    cmd.state = { config: mockConfig }

    await cmd.run()

    await expect(mockAnalyticsService.track).toBeCalledTimes(1)
  })
})
