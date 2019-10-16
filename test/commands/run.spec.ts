import * as Config from '@oclif/config'
import * as path from 'path'
import Run, { RunInputs } from '~/commands/run'
import { ErrorResponse } from '~/errors/ErrorTemplate'
import { FeathersClient } from '~/services/Feathers'
import { WorkflowService } from '~/services/Workflow'
import { OpService } from '~/services/Op'
import { OPS_REGISTRY_HOST } from '~/constants/env'
import { APIError } from '~/errors/CustomErrors'
import { createMockOp, createMockWorkflow } from '../mocks'
import { Services, OpsYml } from '~/types'
import { COMMAND_ENDPOINT } from '~/constants/opConfig'
import { sleep } from '../utils'

let cmd: Run
const nameOrPath = './src/templates/shared/'
const version = '1'
let config
const apiError = new APIError('error')

beforeEach(async () => {
  config = await Config.load()
})

afterEach(async () => {
  // avoid jest open handle error
  await sleep(500)
})

describe('checkPathOpsYmlExists', () => {
  test('should return true if path to ops.yml resolves', async () => {
    cmd = new Run([], config)

    expect(cmd.checkPathOpsYmlExists(nameOrPath)).toBeTruthy()
  })
})

describe('getOpsAndWorkflowsFromFileSystem', () => {
  test('should parse a yaml file', async () => {
    cmd = new Run([], config)
    const result = (await cmd.parseYamlFile(nameOrPath)) as OpsYml

    expect(result.ops[0].name).toBe('hello-world')
    expect(result.workflows[0].name).toBe('hello-world')
    expect(result.version).toBe('1')
  })

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

    cmd = new Run([], config)
    const result = await cmd.getOpsAndWorkflowsFromFileSystem(nameOrPath)(
      inputs as RunInputs,
    )

    expect(result.opsAndWorkflows.length).toBe(2)
  })

  test('should filter out ops which do not match argument', async () => {
    const mockWorkflowName = 'my_mock_workflow'
    const mockWorkflow = createMockWorkflow({ name: mockWorkflowName })

    const mockOpName = 'my_mock_op'
    const mockOp = createMockOp({ name: mockOpName })

    const inputs: Pick<RunInputs, 'parsedArgs' | 'opsAndWorkflows'> = {
      parsedArgs: {
        args: {
          nameOrPath: mockOpName,
        },
        opParams: [''],
        flags: { help: true },
      },
      opsAndWorkflows: [mockOp, mockWorkflow],
    }

    cmd = new Run([], config)
    const result = cmd.filterLocalOps(inputs as RunInputs)

    expect(result.opsAndWorkflows.length).toBe(1)
    expect(result.opsAndWorkflows).toMatchObject([mockOp])
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
      version,
      opsAndWorkflows: [mockOp],
      opOrWorkflow: mockOp,
    }
    cmd = new Run([], config)
    cmd.printCustomHelp = jest.fn()
    const mockExit = jest.spyOn(process, 'exit').mockImplementation()

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
      version,
      opsAndWorkflows: [mockOp],
      opOrWorkflow: mockOp,
    }

    cmd = new Run([], config)
    cmd.printCustomHelp = jest.fn()
    cmd.checkForHelpMessage(inputs)
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
      version,
      opsAndWorkflows: [mockWorkflow],
      opOrWorkflow: mockWorkflow,
    }
    cmd = new Run([], config)
    cmd.printCustomHelp = jest.fn()
    cmd.checkForHelpMessage(inputs)
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
      version,
      opsAndWorkflows: [mockWorkflow],
      opOrWorkflow: mockWorkflow,
    }
    cmd = new Run([], config, {
      workflowService: mockWorkflowService,
    } as Services)
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
      version,
      opsAndWorkflows: [mockOp],
      opOrWorkflow: mockOp,
    }
    cmd = new Run([], config, {
      opService: mockOpService,
    } as Services)
    cmd.executeOpOrWorkflowService(inputs)
    expect(mockOpService.run).toHaveBeenCalledWith(
      mockOp,
      inputs.parsedArgs,
      config,
      version,
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
      version,
      opsAndWorkflows: [mockOp],
      opOrWorkflow: mockOp,
    }
    cmd = new Run([], config, {
      opService: mockOpService,
    } as Services)
    cmd.executeOpOrWorkflowService(inputs)
    expect(mockOpService.run).toHaveBeenCalledWith(
      mockOp,
      inputs.parsedArgs,
      config,
      version,
    )
  })
})

describe('getApiOps', () => {
  test('should successfully call the API endpoint if given a team name and op name', async () => {
    //MOCK FEATHERS
    const mockOp = createMockOp({})
    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest.fn().mockReturnValue({ data: [mockOp] })
    const fakeToken = 'FAKETOKEN'
    const fakeOpName = 'FAKE_OP_NAME'
    const fakeOpTeamName = 'FAKE_OP_TEAM'
    const nameOrPath = `@${fakeOpTeamName}/${fakeOpName}`
    config = {
      tokens: { accessToken: fakeToken },
      team: { id: 'FAKE_TEAM_ID', name: fakeOpTeamName },
      user: {
        username: 'FAKE_USERNAME',
        email: 'FAKE_EMAIL',
        _id: 'FAKE_ID',
      },
    }
    const inputs = {
      parsedArgs: {
        args: {
          nameOrPath,
        },
        opParams: [''],
        flags: {},
      },
      config,
      opName: fakeOpName,
      teamName: fakeOpTeamName,
    } as RunInputs

    cmd = new Run([], config, { api: mockFeathersService } as Services)
    cmd.accessToken = fakeToken
    await cmd.getApiOps(inputs)
    expect(mockFeathersService.find).toHaveBeenCalledWith(
      `teams/${fakeOpTeamName}/ops/${fakeOpName}`,
      {
        headers: {
          Authorization: fakeToken,
        },
      },
    )
  })

  test('should successfully call the API endpoint if given an op name', async () => {
    //MOCK FEATHERS
    const mockOp = createMockOp({})
    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest.fn().mockReturnValue({ data: [mockOp] })
    const fakeToken = 'FAKETOKEN'
    const fakeOpName = 'FAKE_OP_NAME'
    const fakeOpTeamName = 'FAKE_OP_TEAM'
    const nameOrPath = fakeOpName
    config = {
      tokens: { accessToken: fakeToken },
      team: { id: 'FAKE_TEAM_ID', name: fakeOpTeamName },
      user: {
        username: 'FAKE_USERNAME',
        email: 'FAKE_EMAIL',
        _id: 'FAKE_ID',
      },
    }
    const inputs = {
      parsedArgs: {
        args: {
          nameOrPath,
        },
        opParams: [''],
        flags: {},
      },
      config,
      opName: fakeOpName,
      teamName: fakeOpTeamName,
    } as RunInputs

    cmd = new Run([], config, { api: mockFeathersService } as Services)
    cmd.accessToken = fakeToken
    await cmd.getApiOps(inputs)
    expect(mockFeathersService.find).toHaveBeenCalledWith(
      `teams/${fakeOpTeamName}/ops/${fakeOpName}`,
      {
        headers: {
          Authorization: fakeToken,
        },
      },
    )
  })

  test('should handle errors thrown from the api', async () => {
    // MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    const runError: ErrorResponse = {
      data: null,
      error: [{ code: 101, message: 'error_message', requestID: 'request_id' }],
      message: 'error',
      stack: 'error stack',
    }
    mockFeathersService.find = jest.fn().mockRejectedValue(runError)
    const fakeToken = 'FAKE_TOKEN'
    const fakeOpName = 'FAKE_OP_NAME'
    const nameOrPath = fakeOpName
    config = {
      tokens: { accessToken: fakeToken },
      team: { id: 'FAKE_TEAM_ID', name: 'FAKE_TEAM_NAME' },
      user: {
        username: 'FAKE_USERNAME',
        email: 'FAKE_EMAIL',
        _id: 'FAKE_ID',
      },
    }
    const inputs = {
      parsedArgs: {
        args: {
          nameOrPath,
        },
        opParams: [''],
        flags: {},
      },
      config,
      opName: fakeOpName,
      teamName: '',
    } as RunInputs

    cmd = new Run([], config, { api: mockFeathersService } as Services)
    await expect(cmd.getApiOps(inputs)).rejects.toThrow(apiError)
  })
})
