import * as Config from '@oclif/config'
import Search from '~/commands/search'
import { FeathersClient } from '~/services/Feathers'
import {
  Services,
  Config as ConfigType,
  OpCommand,
  SearchInputs,
} from '~/types'
import { sleep } from '../utils'
import { AnalyticsService } from '~/services/Analytics'
import {
  createMockTeam,
  createMockOp,
  createMockUser,
  createMockConfig,
  createMockTokens,
  createMockState,
} from '../mocks'
import { GLUECODE_TYPE, COMMAND } from '~/constants/opConfig'
import { ux } from '@cto.ai/sdk'

let cmd: Search
let config: Config.IConfig

beforeEach(async () => {
  config = await Config.load()
})

afterEach(async () => {
  //avoid jest open handle error
  await sleep(500)
})

describe('getApiOps', () => {
  test('Check if search successfully retrieves ops from the api, and filters out GlueCode', async () => {
    const publicMockOpId = 'PUBLIC_FAKE_OP_ID'
    const gluecodeMockId = 'GLUECODE_FAKE_OP_ID'
    const publicMockOp = createMockOp({
      name: 'FAKE_OP_NAME1',
      id: publicMockOpId,
    })
    const glueCodeOp = createMockOp({
        name: 'FAKE_OP_NAME',
        id: gluecodeMockId,
        type: GLUECODE_TYPE,
      }),
      mockReturnedOps = [publicMockOp, glueCodeOp]
    const mockFeathersService = new FeathersClient()
    const mockToken = createMockTokens({})
    const mockTeam = createMockTeam({ id: 'FAKE_ID', name: 'FAKE_TEAM_NAME' })
    const mockConfig = createMockConfig({ team: mockTeam, tokens: mockToken })

    mockFeathersService.find = jest
      .fn()
      .mockReturnValue({ data: mockReturnedOps })

    cmd = new Search([], config, { api: mockFeathersService } as Services)

    cmd.state = createMockState({ config: mockConfig })

    const res = await cmd.getApiOps({} as SearchInputs)
    expect(res.apiOps.length).toEqual(1)
    expect(res.apiOps[0].id).toEqual(publicMockOpId)
  })
})

describe('sendAnalytics', () => {
  test('Test if analytics are sent', async () => {
    const mockAnalyticsService = new AnalyticsService()
    mockAnalyticsService.track = jest.fn().mockReturnValue(null)

    cmd = new Search([], config, {
      analytics: mockAnalyticsService,
    } as Services)

    const inputs = {
      filter: 'FAKE_FILTER',
      apiOps: [],
      localWorkflows: [],
      selectedOpOrWorkflow: createMockOp({}) as OpCommand,
    } as SearchInputs

    cmd.readConfig = jest.fn().mockReturnValue({
      tokens: createMockTokens({}),
    })
    cmd.team = createMockTeam({})
    cmd.user = createMockUser({})
    cmd.isTokenValid = jest.fn().mockReturnValue(true)
    cmd.isLoggedIn = jest.fn().mockReturnValue(true)
    cmd.config.runHook = jest.fn().mockReturnValue(null)

    await cmd.sendAnalytics('')(inputs)

    expect(mockAnalyticsService.track.mock.calls.length).toBe(1)
  })
})

describe('selectOpOrWorkflowPrompt', () => {
  test('Check if calls are made to ux prompt library ', async () => {
    const selectedTemplate = COMMAND
    cmd = new Search([], config, {} as Services)

    ux.prompt = jest.fn().mockReturnValue({ templates: selectedTemplate })

    cmd.user = createMockUser({})
    cmd.team = createMockTeam({})

    await cmd.selectOpOrWorkflowPrompt({} as SearchInputs)
    expect(cmd.ux.prompt.mock.calls.length).toBe(1)
  })
})
