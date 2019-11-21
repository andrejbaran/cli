/**
 * @author: Prachi Singh (prachi@hackcapital.com)
 * @date: Friday, 8th November 2019 9:17:34 am
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Tuesday, 12th November 2019 3:02:13 pm
 *
 * DESCRIPTION: Add tests
 *
 * @copyright (c) 2019 Hack Capital
 */

import * as Config from '@oclif/config'
import Add from '~/commands/add'
import { isValidOpFullName } from '~/utils/validate'
import { FeathersClient } from '~/services/Feathers'
import { Services, Config as ConfigType, Op, SearchInputs } from '~/types'
import { sleep } from '../utils'
import { AnalyticsService } from '~/services/Analytics'
import {
  createMockTeam,
  createMockOp,
  createMockUser,
  createMockConfig,
  createMockTokens,
} from '../mocks'
import { COMMAND } from '~/constants/opConfig'
import { ux } from '@cto.ai/sdk'
import { OpAlreadyAdded, OpNotFoundOpsAdd } from '~/errors/CustomErrors'

let cmd: Add
let config: Config.IConfig

beforeEach(async () => {
  config = await Config.load()
})

afterEach(async () => {
  //avoid jest open handle error
  await sleep(500)
})

describe('isValidOpFullName', () => {
  test('Test if validity of opName is checked correctly', async () => {
    const inputs = [
      { opName: '@teamname/opName:versionName', res: true },
      { opName: '@teamname/opName', res: true },
      { opName: 'teamname/opName', res: false },
      { opName: '@teamname:opName', res: false },
      { opName: '@teamname/opname/versionname', res: false },
    ]
    inputs.forEach(input => {
      const ans = isValidOpFullName(input.opName)
      expect(ans).toBe(input.res)
    })
  })
})

describe('splitOpName', () => {
  test('Test if splitOpName functions splits the opName correctly', () => {
    const mockFeathersService = new FeathersClient()
    cmd = new Add([], config, { api: mockFeathersService } as Services)

    const res = cmd.splitOpName({ opName: '@teamname/opName:versionname' })
    expect(res.opFilter.opTeamName).toBe('teamname')
    expect(res.opFilter.opName).toBe('opName')
    expect(res.opFilter.opVersionName).toBe('versionname')
  })
})

describe('isOpAlreadyInTeam', () => {
  test(`Test if isOpAlreadyInTeam returns true if op belongs to same team`, () => {
    const mockFeathersService = new FeathersClient()

    cmd = new Add([], config, { api: mockFeathersService } as Services)

    const opResults = []
    const opName = 'op-name'
    const opTeamName = 'op-teamname'
    const opVersionName = 'op-versionName'

    const res = cmd.isOpAlreadyInTeam(
      opResults,
      opName,
      opTeamName,
      opVersionName,
      opTeamName,
    )
    expect(res).toBe(true)
  })

  test(`Test if isOpAlreadyInTeam returns true if op is already added by the team`, () => {
    const mockFeathersService = new FeathersClient()

    cmd = new Add([], config, { api: mockFeathersService } as Services)

    const opName = 'op-name'
    const opTeamName = 'op-teamname'
    const opVersionName = 'op-versionName'
    const opResults = [
      {
        name: opName,
        teamName: opTeamName,
        version: opVersionName,
      },
    ]
    const res = cmd.isOpAlreadyInTeam(
      opResults,
      opName,
      opTeamName,
      opVersionName,
      'some-other-teamname',
    )
    expect(res).toBe(true)
  })

  test(`Test if isOpAlreadyInTeam returns false if op does not belong to the same team`, () => {
    const mockFeathersService = new FeathersClient()

    cmd = new Add([], config, { api: mockFeathersService } as Services)

    const opName = 'op-name'
    const opTeamName = 'op-teamname'
    const opVersionName = 'op-versionName'

    const opResults = [
      {
        name: 'some-other-op-name',
        teamName: opTeamName,
        version: opVersionName,
      },
    ]
    const res = cmd.isOpAlreadyInTeam(
      opResults,
      opName,
      opTeamName,
      opVersionName,
      'some-other-teamname',
    )
    expect(res).toBe(false)
  })
})

describe('addOp', () => {
  test('Test if addOp calls api to add an op', async () => {
    const mockFeathersService = new FeathersClient()
    const mockToken = createMockTokens({})
    const mockTeam = createMockTeam({ id: 'test-id', name: 'test-team-name' })
    const mockConfig = createMockConfig({ team: mockTeam, tokens: mockToken })

    const mockResponse = { data: 1, error: null }
    mockFeathersService.create = jest.fn().mockReturnValue(mockResponse)

    cmd = new Add([], config, { api: mockFeathersService } as Services)

    const opFilter = {
      opName: 'op-name',
      opTeamName: 'op-team-name',
      opVersionName: 'op-version-name',
    }

    const res = await cmd.addOp({ opFilter, config: mockConfig })
    expect(res.addedOpID).toBe(mockResponse.data)
  })

  test('Test if addOp handles ops already added error thrown from api', async () => {
    const mockFeathersService = new FeathersClient()
    const mockToken = createMockTokens({})
    const mockTeam = createMockTeam({ id: 'test-id', name: 'test-team-name' })
    const mockConfig = createMockConfig({ team: mockTeam, tokens: mockToken })

    const mockResponse = {
      data: null,
      error: [
        {
          code: 400,
          message: 'cannot create duplicate op reference for the same team',
          requestID: 'request_id',
        },
      ],
    }
    mockFeathersService.create = jest.fn().mockRejectedValue(mockResponse)

    cmd = new Add([], config, { api: mockFeathersService } as Services)

    const opFilter = {
      opName: 'op-name',
      opTeamName: 'op-team-name',
      opVersionName: 'op-version-name',
    }

    await expect(cmd.addOp({ opFilter, config: mockConfig })).rejects.toThrow(
      OpAlreadyAdded,
    )
  })

  test('Test if addOp handles op not found error thrown from api', async () => {
    const mockFeathersService = new FeathersClient()
    const mockToken = createMockTokens({})
    const mockTeam = createMockTeam({ id: 'test-id', name: 'test-team-name' })
    const mockConfig = createMockConfig({ team: mockTeam, tokens: mockToken })

    const mockResponse = {
      data: null,
      error: [
        {
          code: 400,
          message: 'op not found',
          requestID: 'request_id',
        },
      ],
    }
    mockFeathersService.create = jest.fn().mockRejectedValue(mockResponse)

    cmd = new Add([], config, { api: mockFeathersService } as Services)

    const opFilter = {
      opName: 'op-name',
      opTeamName: 'op-team-name',
      opVersionName: 'op-version-name',
    }

    await expect(cmd.addOp({ opFilter, config: mockConfig })).rejects.toThrow(
      OpNotFoundOpsAdd,
    )
  })
})
