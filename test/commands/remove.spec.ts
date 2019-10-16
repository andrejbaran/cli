import * as Config from '@oclif/config'
import Remove, { RemoveInputs } from '~/commands/remove'

import { COMMAND, WORKFLOW, getEndpointFromOpType } from '~/constants/opConfig'
import { APIError, CannotDeleteOps } from '~/errors/CustomErrors'
import { ErrorResponse } from '~/errors/ErrorTemplate'
import { FeathersClient } from '~/services/Feathers'
import { Op, Workflow, Services, Config as ConfigType } from '~/types'
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
    //MOCK OPS
    const mockOp = {
      id: '123123123',
    } as Op
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest.fn().mockReturnValue({ data: mockOp })

    const inputs = {
      opName: 'fakeOpName',
      removeType: COMMAND,
    } as RemoveInputs
    const fakeToken = 'FAKETOKEN'
    const fakeTeamName = 'FAKE_TEAM_NAME'

    cmd = new Remove([], config, { api: mockFeathersService } as Services)
    cmd.accessToken = fakeToken
    cmd.state = {
      config: {
        team: {
          name: fakeTeamName,
        },
      } as ConfigType,
    }
    await cmd.getApiOpsOrWorkflows(inputs)
    expect(mockFeathersService.find).toHaveBeenCalledWith(
      `teams/${cmd.state.config.team.name}/ops/${inputs.opName}`,
      {
        headers: {
          Authorization: cmd.accessToken,
        },
      },
    )
  })
  test('should successfully retrieve workflows from the api', async () => {
    //MOCK WORKFLOWS
    const mockWf = {
      id: '123123123',
    } as Workflow
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest.fn().mockReturnValue({ data: mockWf })

    const inputs = {
      opName: 'fakeOpName',
      removeType: WORKFLOW,
    } as RemoveInputs
    const fakeToken = 'FAKETOKEN'
    const fakeTeamName = 'FAKE_TEAM_NAME'
    const config = await Config.load()

    cmd = new Remove([], config, { api: mockFeathersService } as Services)
    cmd.accessToken = fakeToken
    cmd.state = {
      config: {
        team: {
          name: fakeTeamName,
        },
      } as ConfigType,
    }
    await cmd.getApiOpsOrWorkflows(inputs)
    expect(mockFeathersService.find).toHaveBeenCalledWith(
      `teams/${cmd.state.config.team.name}/ops/${inputs.opName}`,
      {
        headers: {
          Authorization: cmd.accessToken,
        },
      },
    )
  })
  test('call the `teams/:teamId/ops` endpoint if the opName is not given', async () => {
    //MOCK WORKFLOWS
    const mockWf = {
      id: '123123123',
    } as Workflow
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest.fn().mockReturnValue({ data: mockWf })

    const inputs = {
      opName: '',
      removeType: WORKFLOW,
    } as RemoveInputs
    const fakeToken = 'FAKETOKEN'
    const fakeTeamName = 'FAKE_TEAM_NAME'
    const config = await Config.load()

    cmd = new Remove([], config, { api: mockFeathersService } as Services)
    cmd.accessToken = fakeToken
    cmd.state = {
      config: {
        team: {
          name: fakeTeamName,
        },
      } as ConfigType,
    }
    await cmd.getApiOpsOrWorkflows(inputs)
    expect(mockFeathersService.find).toHaveBeenCalledWith(
      `teams/${cmd.state.config.team.name}/ops`,
      {
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
      opName: 'fakeOpName',
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
