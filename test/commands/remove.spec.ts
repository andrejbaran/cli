import * as Config from '@oclif/config'
import Remove, { RemoveInputs } from '~/commands/remove'

import { COMMAND, WORKFLOW, getEndpointFromOpType } from '~/constants/opConfig'
import {
  APIError,
  NoResultsFoundForDeletion,
  CannotDeleteOps,
} from '~/errors/CustomErrors'
import { ErrorResponse } from '~/errors/ErrorTemplate'
import { FeathersClient } from '~/services/Feathers'
import { Op, Workflow, Services } from '~/types'
import { createMockOp } from '../mocks'
import { sleep } from '../utils'

let cmd: Remove
let config

beforeEach(async () => {
  config = await Config.load()
})

afterEach(async () => {
  // avoid jest open handle error
  await sleep(500)
})

describe('getApiOpsOrWorkflows', () => {
  test('should successfully retrieve ops from the api', async () => {
    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest.fn().mockReturnValue({ data: {} as Op })

    const inputs = {
      filter: 'fakeFilter',
      removeType: COMMAND,
    } as RemoveInputs
    const fakeToken = 'FAKETOKEN'

    cmd = new Remove([], config, { api: mockFeathersService } as Services)
    cmd.accessToken = fakeToken
    cmd.team = {
      id: 'fakeTeamId',
      name: 'fakeTeamName',
    }
    await cmd.getApiOpsOrWorkflows(inputs)
    expect(mockFeathersService.find).toHaveBeenCalledWith(
      getEndpointFromOpType(inputs.removeType),
      {
        query: {
          search: inputs.filter,
          team_id: cmd.team.id,
        },
        headers: {
          Authorization: cmd.accessToken,
        },
      },
    )
  })
  test('should successfully retrieve workflows from the api', async () => {
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest.fn().mockReturnValue({ data: <Workflow>{} })

    const inputs = {
      filter: 'fakeFilter',
      removeType: WORKFLOW,
    } as RemoveInputs
    const fakeToken = 'FAKETOKEN'
    const config = await Config.load()
    cmd = new Remove([], config, { api: mockFeathersService } as Services)
    cmd.accessToken = fakeToken
    cmd.team = {
      id: 'fakeTeamId',
      name: 'fakeTeamName',
    }
    await cmd.getApiOpsOrWorkflows(inputs)
    expect(mockFeathersService.find).toHaveBeenCalledWith(
      `${inputs.removeType}s`,
      {
        query: {
          search: inputs.filter,
          teamId: cmd.team.id,
        },
        headers: {
          Authorization: cmd.accessToken,
        },
      },
    )
  })

  test('should handle errors thrown from the api', async () => {
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest.fn().mockRejectedValue(new Error())

    const inputs = {
      filter: 'fakeFilter',
      removeType: WORKFLOW,
    } as RemoveInputs
    const fakeToken = 'FAKETOKEN'
    const config = await Config.load()
    cmd = new Remove([], config, { api: mockFeathersService } as Services)
    cmd.accessToken = fakeToken
    cmd.team = {
      id: 'fakeTeamId',
      name: 'fakeTeamName',
    }

    await expect(cmd.getApiOpsOrWorkflows(inputs)).rejects.toThrow(APIError)
  })
})

describe('filterResultsByTeam', () => {
  test('should return opsOrWorkflows that belong to the active team', async () => {
    const teamId = 'FAKE_TEAM_ID'
    const teamOps = [
      createMockOp({ teamID: teamId }),
      createMockOp({ teamID: teamId }),
    ]
    const otherOps = [
      createMockOp({ teamID: '' }),
      createMockOp({ teamID: '' }),
      createMockOp({ teamID: '' }),
    ]
    const apiResults: (Op | Workflow)[] = [...otherOps, ...teamOps]
    const inputs = {
      removeType: COMMAND,
      apiResults,
    } as RemoveInputs
    const config = await Config.load()
    cmd = new Remove([], config)
    cmd.team = {
      id: teamId,
      name: '',
    }
    const { apiResults: returnApiResults } = await cmd.filterResultsByTeam(
      inputs,
    )
    expect(returnApiResults.length).toBe(teamOps.length)
  })
  test('should error when no opsOrWorkflows belong to the active team', async () => {
    const teamId = 'FAKE_TEAM_ID'
    const apiResults: (Op | Workflow)[] = [
      createMockOp({ teamID: '' }),
      createMockOp({ teamID: '' }),
      createMockOp({ teamID: '' }),
    ]
    const inputs = {
      removeType: COMMAND,
      apiResults,
    } as RemoveInputs
    const config = await Config.load()
    cmd = new Remove([], config)
    cmd.team = {
      id: teamId,
      name: '',
    }
    const test = () => {
      cmd.filterResultsByTeam(inputs)
    }
    expect(test).toThrow(NoResultsFoundForDeletion)
  })
})

describe('removeApiOpOrWorkflow', () => {
  test('should successfully remove ops from the api', async () => {
    const mockOpId = 'FAKE_OP_ID'
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.remove = jest.fn().mockReturnValue({ data: mockOpId })

    const inputs = {
      opOrWorkflow: createMockOp({ id: mockOpId }),
      removeType: COMMAND,
      confirmRemove: true,
    } as RemoveInputs
    const fakeToken = 'FAKETOKEN'
    const config = await Config.load()
    cmd = new Remove([], config, { api: mockFeathersService } as Services)
    cmd.accessToken = fakeToken
    await cmd.removeApiOpOrWorkflow(inputs)
    expect(mockFeathersService.remove).toHaveBeenCalledWith(
      getEndpointFromOpType(inputs.removeType),
      mockOpId,
      {
        headers: {
          Authorization: cmd.accessToken,
        },
      },
    )
  })

  test('should handle errors thrown from the api', async () => {
    const mockOpId = 'FAKE_OP_ID'
    const removeError: ErrorResponse = {
      data: null,
      error: [{ code: 101, message: 'error_message', requestID: 'request_id' }],
      message: 'error',
      stack: 'error stack',
    }
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.remove = jest.fn().mockRejectedValue(removeError)

    const inputs = {
      opOrWorkflow: createMockOp({ id: mockOpId }),
      removeType: COMMAND,
      confirmRemove: true,
    } as RemoveInputs
    const fakeToken = 'FAKETOKEN'
    const config = await Config.load()
    cmd = new Remove([], config, { api: mockFeathersService } as Services)
    cmd.accessToken = fakeToken
    await expect(cmd.removeApiOpOrWorkflow(inputs)).rejects.toThrow(APIError)
  })

  test(`should handle 'cannot delete ops' error from API`, async () => {
    const mockOpId = 'FAKE_OP_ID'
    const removeError: ErrorResponse = {
      data: null,
      error: [
        { code: 5029, message: 'failed to delete op', requestID: 'request_id' },
      ],
      message: 'cannot delete op',
      stack: 'error stack',
    }
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.remove = jest.fn().mockRejectedValue(removeError)

    const inputs = {
      opOrWorkflow: createMockOp({ id: mockOpId }),
      removeType: COMMAND,
      confirmRemove: true,
    } as RemoveInputs
    const fakeToken = 'FAKETOKEN'
    const config = await Config.load()
    cmd = new Remove([], config, { api: mockFeathersService } as Services)
    cmd.accessToken = fakeToken
    await expect(cmd.removeApiOpOrWorkflow(inputs)).rejects.toThrow(
      CannotDeleteOps,
    )
  })

  test('should return if confirmRemove is false', async () => {
    const mockOpId = 'FAKE_OP_ID'
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.remove = jest.fn().mockRejectedValue(new Error())

    const inputs = {
      opOrWorkflow: createMockOp({ id: mockOpId }),
      removeType: COMMAND,
      confirmRemove: false,
    } as RemoveInputs
    const fakeToken = 'FAKETOKEN'
    const config = await Config.load()
    cmd = new Remove([], config, { api: mockFeathersService } as Services)
    cmd.accessToken = fakeToken
    await cmd.removeApiOpOrWorkflow(inputs)
    expect(mockFeathersService.remove).not.toHaveBeenCalled()
  })
})
