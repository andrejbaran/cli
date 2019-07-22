import * as Config from '@oclif/config'
import * as path from 'path'
import Run, { RunInputs } from '~/commands/run'
import { FeathersClient } from '~/services/Feathers'
import { WorkflowService } from '~/services/Workflow'
import { OpService } from '~/services/Op'
import { OPS_REGISTRY_HOST } from '~/constants/env'
import { APIError } from '~/errors/CustomErrors'
import { createMockOp, createMockWorkflow } from '../mocks'

let cmd: Run
const nameOrPath = './src/templates/shared/'
let config
const apiError = new APIError('error')
beforeEach(async () => {
  config = await Config.load()
})

describe('checkPathOpsYmlExists', () => {
  test('should return true if path to ops.yml resolves', async () => {
    const config = await Config.load()
    cmd = new Run([], config, undefined, undefined)

    expect(cmd.checkPathOpsYmlExists(nameOrPath)).toBeTruthy()
  })
})

describe('getOpsAndWorkflowsFromFileSystem', () => {
  test('should return ops and workflows from the parsed yaml', async () => {
    const inputs: Pick<RunInputs, 'parsedArgs'> = {
      parsedArgs: {
        args: {
          nameOrPath,
        },
        opParams: [''],
        flags: {},
      },
    }

    cmd = new Run([], config, undefined, undefined)
    const testRes = await cmd.getOpsAndWorkflowsFromFileSystem(inputs)
    expect(testRes.opsAndWorkflows.length).toBe(2)
  })
})

describe('checkForHelpMessage', () => {
  test('should call printCustomHelp if help is true and opOrWorkflow is op', async () => {
    const mockOp = createMockOp({})
    const inputs: RunInputs = {
      parsedArgs: {
        args: {
          nameOrPath,
        },
        opParams: [''],
        flags: { help: true },
      },
      config,
      opsAndWorkflows: [mockOp],
      opOrWorkflow: mockOp,
    }
    cmd = new Run([], config, undefined, undefined)
    cmd.printCustomHelp = jest.fn()
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {})

    await cmd.checkForHelpMessage(inputs)
    expect(cmd.printCustomHelp).toHaveBeenCalled()
    expect(mockExit).toHaveBeenCalledWith()
  })
  test('should not call printCustomHelp if help is false', async () => {
    const mockOp = createMockOp({})
    const inputs: RunInputs = {
      parsedArgs: {
        args: {
          nameOrPath,
        },
        opParams: [''],
        flags: { help: false },
      },
      config,
      opsAndWorkflows: [mockOp],
      opOrWorkflow: mockOp,
    }

    cmd = new Run([], config)
    cmd.printCustomHelp = jest.fn()
    await cmd.checkForHelpMessage(inputs)
    expect(cmd.printCustomHelp).not.toBeCalled()
  })
  test('should not call printCustomHelp if opOrWorkflow is a workflow', async () => {
    const mockWorkflow = createMockWorkflow({})
    const inputs: RunInputs = {
      parsedArgs: {
        args: {
          nameOrPath,
        },
        opParams: [''],
        flags: { help: true },
      },
      config,
      opsAndWorkflows: [mockWorkflow],
      opOrWorkflow: mockWorkflow,
    }
    cmd = new Run([], config)
    cmd.printCustomHelp = jest.fn()
    await cmd.checkForHelpMessage(inputs)
    expect(cmd.printCustomHelp).not.toBeCalled()
  })
})

describe('executeOpOrWorkflowService', () => {
  test('should call the WorkflowService if opOrWorkflow is a workflow', async () => {
    const mockWorkflowService = new WorkflowService()
    mockWorkflowService.run = jest.fn()
    const mockWorkflow = createMockWorkflow({})
    const opParams = ['arg1', 'arg2']
    const inputs: RunInputs = {
      parsedArgs: {
        args: {
          nameOrPath,
        },
        opParams,
        flags: {},
      },
      config,
      opsAndWorkflows: [mockWorkflow],
      opOrWorkflow: mockWorkflow,
    }
    cmd = new Run(
      [],
      config,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mockWorkflowService,
    )
    cmd.executeOpOrWorkflowService(inputs)
    expect(mockWorkflowService.run).toHaveBeenCalledWith(
      mockWorkflow,
      opParams,
      config,
    )
  })
  test('should call the OpService if opOrWorkflow is a op', async () => {
    const mockOpService = new OpService()
    mockOpService.run = jest.fn()
    const mockOp = createMockOp({ isPublished: true })
    const opParams = ['arg1', 'arg2']
    const inputs: RunInputs = {
      parsedArgs: {
        args: {
          nameOrPath,
        },
        opParams,
        flags: {},
      },
      config,
      opsAndWorkflows: [mockOp],
      opOrWorkflow: mockOp,
    }
    cmd = new Run(
      [],
      config,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mockOpService,
    )
    cmd.executeOpOrWorkflowService(inputs)
    expect(mockOpService.run).toHaveBeenCalledWith(
      mockOp,
      inputs.parsedArgs,
      config,
    )
  })
  test('should set the image if the  opOrWorkflow is a op and not published', async () => {
    config.team = {
      name: 'FAKE_TEAM_NAME',
    }
    const mockOpService = new OpService()
    mockOpService.run = jest.fn()
    const mockOp = createMockOp({ isPublished: false, name: 'FAKE_OP_NAME' })
    const opParams = ['arg1', 'arg2']
    const inputs: RunInputs = {
      parsedArgs: {
        args: {
          nameOrPath,
        },
        opParams,
        flags: {},
      },
      config,
      opsAndWorkflows: [mockOp],
      opOrWorkflow: mockOp,
    }
    cmd = new Run(
      [],
      config,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mockOpService,
    )
    cmd.executeOpOrWorkflowService(inputs)
    mockOp.image = path.join(
      OPS_REGISTRY_HOST,
      `${config.team.name}/${mockOp.name}`,
    )
    expect(mockOpService.run).toHaveBeenCalledWith(
      mockOp,
      inputs.parsedArgs,
      config,
    )
  })
})

describe('getApiOps', () => {
  test('should successfully retrieve ops from the api', async () => {
    //MOCK FEATHERS
    const mockOp = createMockOp({})
    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest.fn()
    mockFeathersService.find.mockReturnValue({ data: [mockOp] })
    const fakeToken = 'FAKETOKEN'
    const nameOrPath = 'FAKE_OP_NAME'
    config = {
      accessToken: fakeToken,
      team: { id: 'FAKE_TEAM_ID', name: 'FAKE_TEAM_NAME' },
      user: {
        username: 'FAKE_USERNAME',
        email: 'FAKE_EMAIL',
        _id: 'FAKE_ID',
      },
    }
    const inputs: Omit<RunInputs, 'opsAndWorkflows' | 'opOrWorkflow'> = {
      parsedArgs: {
        args: {
          nameOrPath,
        },
        opParams: [''],
        flags: {},
      },
      config,
    }

    cmd = new Run([], config, mockFeathersService)
    await cmd.getApiOps(inputs)
    expect(mockFeathersService.find).toHaveBeenCalledWith('ops', {
      query: {
        search: nameOrPath,
        team_id: config.team.id,
      },
      headers: {
        Authorization: fakeToken,
      },
    })
  })

  test('should handle errors thrown from the api', async () => {
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest.fn()
    mockFeathersService.find.mockRejectedValue(new Error())
    const fakeToken = 'FAKE_TOKEN'
    config = {
      accessToken: fakeToken,
      team: { id: 'FAKE_TEAM_ID', name: 'FAKE_TEAM_NAME' },
      user: {
        username: 'FAKE_USERNAME',
        email: 'FAKE_EMAIL',
        _id: 'FAKE_ID',
      },
    }
    const inputs: Omit<RunInputs, 'opsAndWorkflows' | 'opOrWorkflow'> = {
      parsedArgs: {
        args: {
          nameOrPath,
        },
        opParams: [''],
        flags: {},
      },
      config,
    }

    cmd = new Run([], config, mockFeathersService)
    await expect(cmd.getApiOps(inputs)).rejects.toThrow(apiError)
  })
})

describe('getApiWorkflows', () => {
  test('should successfully retrieve workflows from the api', async () => {
    const mockWorkflow = createMockWorkflow({})
    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest.fn()
    mockFeathersService.find.mockReturnValue({ data: [mockWorkflow] })
    const fakeToken = 'FAKETOKEN'
    const nameOrPath = 'FAKE_OP_NAME'
    config = {
      accessToken: fakeToken,
      team: { id: 'FAKE_TEAM_ID', name: 'FAKE_TEAM_NAME' },
      user: {
        username: 'FAKE_USERNAME',
        email: 'FAKE_EMAIL',
        _id: 'FAKE_ID',
      },
    }
    const inputs: Omit<RunInputs, 'opOrWorkflow'> = {
      parsedArgs: {
        args: {
          nameOrPath,
        },
        opParams: [''],
        flags: {},
      },
      opsAndWorkflows: [],
      config,
    }

    cmd = new Run([], config, mockFeathersService)
    await cmd.getApiWorkflows(inputs)
    expect(mockFeathersService.find).toHaveBeenCalledWith('workflows', {
      query: {
        search: nameOrPath,
        teamId: config.team.id,
      },
      headers: {
        Authorization: fakeToken,
      },
    })
  })

  test('should handle errors thrown from the api', async () => {
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest.fn()
    mockFeathersService.find.mockRejectedValue(apiError)
    const fakeToken = 'FAKE_TOKEN'
    config = {
      accessToken: fakeToken,
      team: { id: 'FAKE_TEAM_ID', name: 'FAKE_TEAM_NAME' },
      user: {
        username: 'FAKE_USERNAME',
        email: 'FAKE_EMAIL',
        _id: 'FAKE_ID',
      },
    }
    const inputs: Omit<RunInputs, 'opsAndWorkflows' | 'opOrWorkflow'> = {
      parsedArgs: {
        args: {
          nameOrPath,
        },
        opParams: [''],
        flags: {},
      },
      config,
    }

    cmd = new Run([], config, mockFeathersService)
    await expect(cmd.getApiWorkflows(inputs)).rejects.toThrow(apiError)
  })
})
