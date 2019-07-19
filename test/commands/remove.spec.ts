import * as Config from '@oclif/config'
import Remove, { RemoveInputs } from '~/commands/remove'
import { FeathersClient } from '~/services/feathers'
import { Op, Workflow } from '~/types'
import { OP, WORKFLOW } from '~/constants/opConfig'
import { APIError, NoResultsFoundForDeletion } from '~/errors/customErrors'
import { createMockOp } from '../mocks'

let cmd: Remove
let config
beforeEach(async () => {
  config = await Config.load()
})
describe('getApiOpsOrWorkflows', () => {
  test('should successfully retrieve ops from the api', async () => {
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest.fn()
    mockFeathersService.find.mockReturnValue({ data: <Op>{} })

    const inputs: Pick<RemoveInputs, 'filter' | 'removeType'> = {
      filter: 'fakeFilter',
      removeType: OP,
    }
    const fakeToken = 'FAKETOKEN'

    cmd = new Remove([], config, mockFeathersService, undefined)
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
    mockFeathersService.find = jest.fn()
    mockFeathersService.find.mockReturnValue({ data: <Workflow>{} })

    const inputs: Pick<RemoveInputs, 'filter' | 'removeType'> = {
      filter: 'fakeFilter',
      removeType: WORKFLOW,
    }
    const fakeToken = 'FAKETOKEN'
    const config = await Config.load()
    cmd = new Remove([], config, mockFeathersService, undefined)
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
    mockFeathersService.find = jest.fn()
    mockFeathersService.find.mockRejectedValue(new Error())

    const inputs: Pick<RemoveInputs, 'filter' | 'removeType'> = {
      filter: 'fakeFilter',
      removeType: WORKFLOW,
    }
    const fakeToken = 'FAKETOKEN'
    const config = await Config.load()
    cmd = new Remove([], config, mockFeathersService, undefined)
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
    const inputs: Pick<RemoveInputs, 'apiResults' | 'removeType'> = {
      removeType: OP,
      apiResults,
    }
    const config = await Config.load()
    cmd = new Remove([], config, undefined, undefined)
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
    const inputs: Pick<RemoveInputs, 'apiResults' | 'removeType'> = {
      removeType: OP,
      apiResults,
    }
    const config = await Config.load()
    cmd = new Remove([], config, undefined, undefined)
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
    mockFeathersService.remove = jest.fn()
    mockFeathersService.remove.mockReturnValue({ data: mockOpId })

    const inputs: Pick<
      RemoveInputs,
      'opOrWorkflow' | 'removeType' | 'confirmRemove'
    > = {
      opOrWorkflow: createMockOp({ id: mockOpId }),
      removeType: OP,
      confirmRemove: true,
    }
    const fakeToken = 'FAKETOKEN'
    const config = await Config.load()
    cmd = new Remove([], config, mockFeathersService, undefined)
    cmd.accessToken = fakeToken
    await cmd.removeApiOpOrWorkflow(inputs)
    expect(mockFeathersService.remove).toHaveBeenCalledWith(
      `${inputs.removeType}s`,
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
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.remove = jest.fn()
    mockFeathersService.remove.mockRejectedValue(new Error())

    const inputs: Pick<
      RemoveInputs,
      'opOrWorkflow' | 'removeType' | 'confirmRemove'
    > = {
      opOrWorkflow: createMockOp({ id: mockOpId }),
      removeType: OP,
      confirmRemove: true,
    }
    const fakeToken = 'FAKETOKEN'
    const config = await Config.load()
    cmd = new Remove([], config, mockFeathersService, undefined)
    cmd.accessToken = fakeToken
    await expect(cmd.removeApiOpOrWorkflow(inputs)).rejects.toThrow(APIError)
  })

  test('should return if confirmRemove is false', async () => {
    const mockOpId = 'FAKE_OP_ID'
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.remove = jest.fn()
    mockFeathersService.remove.mockRejectedValue(new Error())

    const inputs: Pick<
      RemoveInputs,
      'opOrWorkflow' | 'removeType' | 'confirmRemove'
    > = {
      opOrWorkflow: createMockOp({ id: mockOpId }),
      removeType: OP,
      confirmRemove: false,
    }
    const fakeToken = 'FAKETOKEN'
    const config = await Config.load()
    cmd = new Remove([], config, mockFeathersService, undefined)
    cmd.accessToken = fakeToken
    await cmd.removeApiOpOrWorkflow(inputs)
    expect(mockFeathersService.remove).not.toHaveBeenCalled()
  })
})
