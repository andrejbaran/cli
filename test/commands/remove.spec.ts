import * as Config from '@oclif/config'
import Remove from '~/commands/remove'

import { COMMAND, WORKFLOW } from '~/constants/opConfig'
import {
  APIError,
  CannotDeleteOp,
  InvalidRemoveOpFormat,
} from '~/errors/CustomErrors'
import { createMockTeam, createMockConfig } from '../mocks'
import { ErrorResponse } from '~/errors/ErrorTemplate'
import { FeathersClient } from '~/services/Feathers'
import { OpCommand, Services, RemoveInputs } from '~/types'
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

describe('validateOpNameAndVersion', () => {
  test('Check validity of op argument provided by user', async () => {
    const mockFeathersService = new FeathersClient()
    cmd = new Remove([], config, { api: mockFeathersService } as Services)

    const mockConfig = createMockConfig({
      team: createMockTeam({ id: 'test-id', name: 'test-team-name' }),
    })
    const output1 = cmd.validateOpNameAndVersion({
      op: '@test-team-name/opName:versionName',
      config: mockConfig,
    })
    expect(output1.opTeamName).toBe('test-team-name')
    expect(output1.opName).toBe('opName')
    expect(output1.opVersion).toBe('versionName')

    const output2 = cmd.validateOpNameAndVersion({
      op: 'opName:versionName',
      config: mockConfig,
    })
    expect(output2.opTeamName).toBe(mockConfig.team.name)
    expect(output2.opName).toBe('opName')
    expect(output2.opVersion).toBe('versionName')

    const input3 = { op: '@test-team-name/opName', config: mockConfig }
    try {
      cmd.validateOpNameAndVersion(input3)
    } catch (err) {
      expect(err).toStrictEqual(new InvalidRemoveOpFormat())
    }

    const input4 = { op: 'opName', config: mockConfig }
    try {
      cmd.validateOpNameAndVersion(input4)
    } catch (err) {
      expect(err).toStrictEqual(new InvalidRemoveOpFormat())
    }

    const input5 = { op: '@/opName:versionName', config: mockConfig }
    try {
      cmd.validateOpNameAndVersion(input5)
    } catch (err) {
      expect(err).toStrictEqual(new InvalidRemoveOpFormat())
    }
  })
})

describe('getApiOpsOrWorkflows', () => {
  test('should successfully retrieve ops from the api', async () => {
    //MOCK OPS
    const mockOp = {
      id: '123123123',
    } as OpCommand
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest.fn().mockReturnValue({
      data: mockOp,
      catch: jest.fn().mockReturnValue({ data: mockOp }),
    })

    const fakeToken = 'FAKETOKEN'
    const fakeTeamName = 'FAKE_TEAM_NAME'
    const fakeOpName = 'fakeOpName'
    const fakeOpVersion = 'fakeOpVersion'
    const inputs = {
      opName: fakeOpName,
      opVersion: fakeOpVersion,
      opTeamName: fakeTeamName,
      config: {
        team: {
          name: fakeTeamName,
        },
        tokens: {
          accessToken: fakeToken,
        },
      },
    } as RemoveInputs

    cmd = new Remove([], config, { api: mockFeathersService } as Services)
    await cmd.getApiOpsOrWorkflows(inputs)
    expect(mockFeathersService.find).toHaveBeenCalledWith(
      `/private/teams/${fakeTeamName}/ops/${fakeOpName}/versions/${fakeOpVersion}`,
      {
        headers: {
          Authorization: fakeToken,
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
    const mockOpName = 'FakeOpName'
    const mockFeathersService = new FeathersClient()
    mockFeathersService.remove = jest.fn().mockReturnValue({ data: mockOpName })
    const mockOpVersion = 'FakeOpVersion'
    const mockAccessToken = 'FakeToken'
    const mockTeamName = 'FakeTeamName'
    const mockDeleteDescription = 'FakeDeleteDescription'

    const inputs = {
      opOrWorkflow: createMockOp({
        name: mockOpName,
        version: mockOpVersion,
        teamName: mockTeamName,
      }),
      confirmRemove: true,
      deleteDescription: mockDeleteDescription,
      config: {
        team: {
          name: mockTeamName,
        },
        tokens: {
          accessToken: mockAccessToken,
        },
      },
    } as RemoveInputs

    const config = await Config.load()
    cmd = new Remove([], config, { api: mockFeathersService } as Services)

    await cmd.removeApiOpOrWorkflow(inputs)
    expect(mockFeathersService.remove).toHaveBeenCalledWith(
      `/private/teams/${mockTeamName}/ops/${mockOpName}/versions`,
      mockOpVersion,
      {
        query: {
          deleteDescription: mockDeleteDescription,
        },
        headers: {
          Authorization: mockAccessToken,
        },
      },
    )
  })

  test('should handle errors thrown from the api', async () => {
    const mockOpName = 'FakeOpName'
    const removeError: ErrorResponse = {
      data: null,
      error: [{ code: 101, message: 'error_message', requestID: 'request_id' }],
      message: 'error',
      stack: 'error stack',
    }
    const mockOpVersion = 'FakeOpVersion'
    const mockAccessToken = 'FakeToken'
    const mockTeamName = 'FakeTeamName'
    const mockDeleteDescription = 'FakeDeleteDescription'

    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.remove = jest.fn().mockRejectedValue(removeError)

    const inputs = {
      opOrWorkflow: createMockOp({
        name: mockOpName,
        version: mockOpVersion,
        teamName: mockTeamName,
      }),
      confirmRemove: true,
      deleteDescription: mockDeleteDescription,
      config: {
        team: {
          name: mockTeamName,
        },
        tokens: {
          accessToken: mockAccessToken,
        },
      },
    } as RemoveInputs
    const config = await Config.load()
    cmd = new Remove([], config, { api: mockFeathersService } as Services)
    await expect(cmd.removeApiOpOrWorkflow(inputs)).rejects.toThrow(
      CannotDeleteOp,
    )
  })

  test(`should handle 'cannot delete ops' error from API`, async () => {
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
      opOrWorkflow: createMockOp({}),
      config: {
        tokens: {
          accessToken: 'FakeAccessToken',
        },
      },
      confirmRemove: true,
    } as RemoveInputs
    const config = await Config.load()
    cmd = new Remove([], config, { api: mockFeathersService } as Services)
    await expect(cmd.removeApiOpOrWorkflow(inputs)).rejects.toThrow(
      CannotDeleteOp,
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
