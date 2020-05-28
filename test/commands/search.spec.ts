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
  createMockWorkflow,
  createMockUser,
  createMockConfig,
  createMockTokens,
  createMockState,
} from '../mocks'
import { GLUECODE_TYPE, COMMAND, WORKFLOW_TYPE } from '~/constants/opConfig'
import { ux } from '@cto.ai/sdk'

let cmd: Search
let config: Config.IConfig
let mockInputs: SearchInputs

const publicMockOpId = 'PUBLIC_FAKE_OP_ID'
const gluecodeMockId = 'GLUECODE_FAKE_OP_ID'
const workflowMockId = 'WORKFLOW_FAKE_OP_ID'

beforeEach(async () => {
  config = await Config.load()
})

afterEach(async () => {
  //avoid jest open handle error
  await sleep(500)
})

describe('getApiOpsAndWorkflows', () => {
  test('Check if search successfully retrieves ops from the api', async () => {
    const publicMockOpId = 'PUBLIC_FAKE_OP_ID'
    const publicMockOp = createMockOp({
      name: 'FAKE_OP_NAME1',
      id: publicMockOpId,
    })
    const mockReturnedOps = [publicMockOp]
    const mockFeathersService = new FeathersClient()
    const mockToken = createMockTokens({})
    const mockTeam = createMockTeam({ id: 'FAKE_ID', name: 'FAKE_TEAM_NAME' })
    const mockConfig = createMockConfig({ team: mockTeam, tokens: mockToken })

    mockFeathersService.find = jest
      .fn()
      .mockReturnValue({ data: mockReturnedOps })

    cmd = new Search([], config, { api: mockFeathersService } as Services)

    cmd.state = createMockState({ config: mockConfig })

    const res = await cmd.getApiOpsAndWorkflows({} as SearchInputs)
    expect(res.apiOps).toHaveLength(1)
    expect(res.apiOps).toContain(publicMockOp)
  })
})

describe('filters', () => {
  let publicMockOp, glueCodeOp, publicWorkflowOp

  beforeAll(() => {
    publicMockOp = createMockOp({
      name: 'FAKE_OP_NAME1',
      id: publicMockOpId,
    })
    glueCodeOp = createMockOp({
      name: 'FAKE_OP_NAME',
      id: gluecodeMockId,
      type: GLUECODE_TYPE,
    })
    publicWorkflowOp = createMockWorkflow({
      name: 'FAKE_WORKFLOW_NAME',
      id: workflowMockId,
    })
    const mockReturnedOps = [publicMockOp, glueCodeOp, publicWorkflowOp]
    mockInputs = {
      filter: 'FAKE_FILTER',
      apiOps: mockReturnedOps,
      selectedOp: createMockOp({}) as OpCommand,
    } as SearchInputs
  })

  test('Check if filterOutGlueCodes successfully removes glue code ops', async () => {
    const { apiOps: filteredOps } = cmd.filterOutGlueCodes(mockInputs)
    expect(filteredOps).toHaveLength(2)
    expect(filteredOps).not.toContain(glueCodeOp)
  })

  test('Check if filterOutWorkflows successfully removes workflows', async () => {
    const { apiOps: filteredOps } = cmd.filterOutWorkflows(mockInputs)
    expect(filteredOps).toHaveLength(2)
    expect(filteredOps).not.toContain(publicWorkflowOp)
  })

  test('Check if filterByNameOrDescription successfully removes ops that do not match', async () => {
    const matchingMockOpFilter = createMockOp({
      name: 'FAKE_OP_NAME_FAKE_FILTER',
      id: 'FAKE_OP_FILTERED_ID',
    })
    mockInputs.apiOps.push(matchingMockOpFilter)
    const { apiOps: filteredOps } = cmd.filterByNameOrDescription(mockInputs)
    expect(filteredOps).toHaveLength(1)
    expect(filteredOps).toContain(matchingMockOpFilter)
  })
})

describe('sendAnalytics', () => {
  test('Test if analytics are sent', async () => {
    const mockAnalyticsService = new AnalyticsService()
    mockAnalyticsService.track = jest.fn().mockReturnValue(null)
    cmd = new Search([], config, {
      analytics: mockAnalyticsService,
    } as Services)
    const mockConfig = createMockConfig({})
    const inputs = {
      filter: 'FAKE_FILTER',
      apiOps: [],
      selectedOp: createMockOp({}) as OpCommand,
      config: mockConfig,
    } as SearchInputs

    cmd.readConfig = jest.fn().mockReturnValue({
      tokens: createMockTokens({}),
    })
    cmd.team = createMockTeam({})
    cmd.user = createMockUser({})
    cmd.isTokenValid = jest.fn().mockReturnValue(true)
    cmd.isLoggedIn = jest.fn().mockReturnValue(true)
    cmd.config.runHook = jest.fn().mockReturnValue(null)

    await cmd.sendAnalytics(inputs)

    expect(mockAnalyticsService.track).toHaveBeenCalledTimes(1)
  })
})

describe('selectOpPrompt', () => {
  test('Check if calls are made to ux prompt library ', async () => {
    const selectedTemplate = COMMAND
    cmd = new Search([], config, {} as Services)

    ux.prompt = jest.fn().mockReturnValue({ templates: selectedTemplate })

    cmd.user = createMockUser({})
    cmd.team = createMockTeam({})

    await cmd.selectOpPrompt({} as SearchInputs)
    expect(cmd.ux.prompt).toHaveBeenCalledTimes(1)
  })
})
