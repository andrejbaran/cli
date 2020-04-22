import * as Config from '@oclif/config'
import List from '~/commands/list'
import { FeathersClient } from '~/services/Feathers'
import { Services, Config as ConfigType, Team, ListInputs } from '~/types'
import {
  COMMAND_TYPE,
  GLUECODE_TYPE,
  WORKFLOW_TYPE,
  WORKFLOW,
} from '~/constants/opConfig'
import { sleep } from '../utils'
import {
  createMockTeam,
  createMockConfig,
  createMockTokens,
  createMockState,
  createMockWorkflow,
  createMockUser,
  createMockOp,
} from '../mocks'
import { ux } from '@cto.ai/sdk'

let cmd: List
let config: Config.IConfig
let mockInputs: ListInputs

const publicMockOpId = 'PUBLIC_FAKE_OP_ID'
const privateMockOpId = 'PRIVATE_FAKE_OP_ID'
const gluecodeMockId = 'GLUECODE_FAKE_OP_ID'
const workflowMockId = 'WORKFLOW_FAKE_OP_ID'

beforeEach(async () => {
  config = await Config.load()
})

afterEach(async () => {
  //avoid jest open handle error
  await sleep(500)
})

describe('promptOps', () => {
  test('Check if call is made to ux prompt library', async () => {
    const selectedTemplate = WORKFLOW
    cmd = new List([], config, {} as Services)
    ux.prompt = jest.fn().mockReturnValue({ templates: selectedTemplate })
    const inputs = {
      opResults: [{}],
      selectedOp: createMockOp({}),
      config: {
        team: createMockTeam({}),
      },
    } as ListInputs

    cmd.user = createMockUser({})

    await cmd.promptOps(inputs)
    expect(cmd.ux.prompt.mock.calls.length).toBe(1)
  })
})

describe('getApiOps', () => {
  test('Check if list displays public and private ops', async () => {
    const mockToken = createMockTokens({})
    const mockTeam = createMockTeam({ id: 'FAKE_ID', name: 'FAKE_TEAM_NAME' })
    const mockConfig = createMockConfig({ team: mockTeam, tokens: mockToken })

    const mockReturnedOps = [
      { id: publicMockOpId, isPublic: true },
      { id: privateMockOpId, isPublic: false },
    ]
    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest
      .fn()
      .mockReturnValue({ data: mockReturnedOps })

    cmd = new List([], config, { api: mockFeathersService } as Services)

    const res = await cmd.getApiOps({ config: mockConfig } as ListInputs)
    expect(res.opResults).toEqual(mockReturnedOps)
  })
})

describe('filters', () => {
  let publicMockOp, glueCodeOp, workflowMockOp

  beforeAll(() => {
    publicMockOp = createMockOp({
      id: publicMockOpId,
      isPublic: true,
      type: COMMAND_TYPE,
    })
    glueCodeOp = createMockOp({
      id: gluecodeMockId,
      isPublic: false,
      type: GLUECODE_TYPE,
    })
    workflowMockOp = createMockWorkflow({
      id: workflowMockId,
      isPublic: false,
      type: WORKFLOW_TYPE,
    })

    const mockReturnedOps = [publicMockOp, glueCodeOp, workflowMockOp]

    const mockToken = createMockTokens({})
    const mockTeam = createMockTeam({ id: 'FAKE_ID', name: 'FAKE_TEAM_NAME' })
    const mockConfig = createMockConfig({ team: mockTeam, tokens: mockToken })
    mockInputs = {
      config: mockConfig,
      opResults: mockReturnedOps,
      selectedOp: {},
    } as ListInputs
  })

  test('Check if filterOutGlueCodes filters out gluecode', async () => {
    const { opResults: filteredOps } = cmd.filterOutGlueCodes(mockInputs)
    expect(filteredOps).toHaveLength(2)
    expect(filteredOps).not.toContain(glueCodeOp)
  })

  test('Check if filterOutWorkflows filters out workflows', async () => {
    const { opResults: filteredOps } = cmd.filterOutWorkflows(mockInputs)
    expect(filteredOps).toHaveLength(2)
    expect(filteredOps).not.toContain(workflowMockOp)
  })
})
