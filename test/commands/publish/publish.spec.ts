import * as Config from '@oclif/config'
import Publish from './../../../src/commands/publish'
import { PublishInputs } from './../../../src/commands/publish'
import { BuildSteps } from '~/services/BuildSteps'
import { FeathersClient } from '~/services/Feathers'
import { ImageService } from './../../../src/services/Image'
import { Publish } from '~/services/Publish'
import { Op, RegistryAuth } from './../../../src/types'
import { Workflow } from './../../../src/types/OpsYml'
import { createMockWorkflow } from './../../../test/mocks/index.ts'

let cmd: Publish

describe('BuildStep', () => {
  it('should validate all steps for remote workflow', async () => {
    const workflowArray: Workflow[] = [
      createMockWorkflow({
        remote: true,
        steps: [
          'ops run op1',
          "var stuff1 = 'mock values 1';",
          'ops run op2',
          'ops run op3',
          "var stuff2 = 'mock values 2';",
        ],
        teamID: 'team-id',
      }),
    ]

    const inputs: PublishInputs = {
      workflows: workflowArray,
    } as PublishInputs

    console.log('DDDDDDDDDDDD', workflowArray[0])

    // MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.create = jest.fn()
    mockFeathersService.create.mockReturnValue({ data: {} as Op })

    // SPY ON BUILD STEPS
    const mockBuildStepService = new BuildSteps()
    mockBuildStepService.isGlueCode = jest.fn()
    mockBuildStepService.isGlueCode.mockReturnValue(true)

    mockBuildStepService.buildAndPublishGlueCode = jest.fn()
    mockBuildStepService.buildAndPublishGlueCode.mockReturnValue(
      'ops run mock-op',
    )

    mockBuildStepService.isOpRun = jest.fn()
    mockBuildStepService.isOpRun.mockReturnValue(true)

    const config = await Config.load()
    cmd = new Publish(
      [],
      config,
      mockFeathersService,
      undefined,
      mockBuildStepService,
    )
    cmd.team = {
      id: 'team-id',
      name: 'team-name',
    }

    cmd.getRegistryAuth = jest.fn()
    cmd.getRegistryAuth.mockReturnValue({} as RegistryAuth)

    await cmd.workflowsPublishLoop(inputs)

    expect(mockBuildStepService.isGlueCode).toHaveBeenCalledWith('ops run op1')
    expect(mockBuildStepService.isGlueCode).toHaveBeenCalledWith(
      "var stuff1 = 'mock values 1';",
    )
    expect(mockBuildStepService.isGlueCode).toHaveBeenCalledWith('ops run op2')
    expect(mockBuildStepService.isGlueCode).toHaveBeenCalledWith('ops run op3')
    expect(mockBuildStepService.isGlueCode).toHaveBeenCalledWith(
      "var stuff2 = 'mock values 2';",
    )

    expect(mockBuildStepService.isGlueCode).toHaveBeenCalledTimes(5)
  })

  it('should replace all glue code steps with ops run', async () => {
    const workflowArray: Workflow[] = [
      createMockWorkflow({
        remote: true,
        steps: [
          'ops run op1',
          "var stuff1 = 'mock values 1';",
          'ops run op2',
          'ops run op3',
          "var stuff2 = 'mock values 2';",
        ],
        teamID: 'team-id',
      }),
    ]

    const inputs: PublishInputs = {
      workflows: workflowArray,
    } as PublishInputs

    // SPY ON FEATHERS CREATE
    const mockFeathersService = new FeathersClient()
    mockFeathersService.create = jest.fn()
    mockFeathersService.create.mockReturnValue({ data: {} as Op })

    // MOCK BUILD STEP SERVICE
    const mockBuildStepService = new BuildSteps()
    mockBuildStepService.isGlueCode = jest.fn()
    mockBuildStepService.isGlueCode.mockReturnValue(true)

    mockBuildStepService.buildAndPublishGlueCode = jest.fn()
    mockBuildStepService.buildAndPublishGlueCode.mockReturnValue(
      'ops run mock-op',
    )

    mockBuildStepService.isOpRun = jest.fn()
    mockBuildStepService.isOpRun.mockReturnValue(true)

    const config = await Config.load()
    cmd = new Publish(
      [],
      config,
      mockFeathersService,
      undefined,
      mockBuildStepService,
    )
    cmd.team = {
      id: 'team-id',
      name: 'team-name',
    }

    cmd.getRegistryAuth = jest.fn()
    cmd.getRegistryAuth.mockReturnValue({} as RegistryAuth)

    await cmd.workflowsPublishLoop(inputs)

    expect(mockFeathersService.create).toHaveBeenCalledWith(
      'workflows',
      createMockWorkflow({
        remote: true,
        steps: [
          'ops run mock-op',
          'ops run mock-op',
          'ops run mock-op',
          'ops run mock-op',
          'ops run mock-op',
        ],
        teamID: 'team-id',
      }),
      { headers: { Authorization: undefined } },
    )

    expect(mockFeathersService.create).toHaveBeenCalledTimes(1)
  })
})

it('should publish ops in a loop', async () => {
  const mockConfig = {} as Config.IConfig
  mockConfig.runHook = jest.fn()
  mockConfig.runHook.mockReturnValue(true)

  const mockImageService = new ImageService()
  mockImageService.checkLocalImage = jest.fn()
  mockImageService.checkLocalImage.mockReturnValue(true)

  const mockPublishService = new Publish()
  mockPublishService.publishOp = jest.fn()
  mockPublishService.publishOp.mockReturnValue({
    data: {
      name: 'mock-op',
    } as Op,
  })

  cmd = new Publish(
    [],
    mockConfig,
    undefined,
    mockPublishService,
    undefined,
    mockImageService,
  )
  cmd.team = {
    id: 'team-id',
    name: 'team-name',
  }

  cmd.getRegistryAuth = jest.fn()
  cmd.getRegistryAuth.mockReturnValue({} as RegistryAuth)

  const inputs: PublishInputs = {
    version: 'mockVersion',
    ops: [
      {
        name: 'mock-op',
      } as Op,
    ],
  } as PublishInputs

  cmd.opsPublishLoop(inputs)
})
