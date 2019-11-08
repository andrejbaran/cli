import * as Config from '@oclif/config'
import Publish from '~/commands/publish'
import { PublishInputs } from '~/commands/publish'
import { BuildSteps } from '~/services/BuildSteps'
import { FeathersClient } from '~/services/Feathers'
import { RegistryAuthService } from '~/services/RegistryAuth'
import { ImageService } from '~/services/Image'
import { Op, RegistryAuth, User } from '~/types'
import { Workflow } from '~/types/OpsYml'
import { Services } from '~/types'
import { Publish as PublishService } from '~/services/Publish'
import { createMockWorkflow } from './../../../test//mocks'

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

    // MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.create = jest.fn().mockReturnValue({ data: {} as Op })

    // SPY ON BUILD STEPS
    const mockBuildStepService = new BuildSteps()
    mockBuildStepService.isGlueCode = jest.fn().mockReturnValue(true)

    mockBuildStepService.buildAndPublishGlueCode = jest
      .fn()
      .mockReturnValue('ops run mock-op')

    mockBuildStepService.isOpRun = jest.fn().mockReturnValue(true)

    const mockRegistryAuthService = new RegistryAuthService()
    mockRegistryAuthService.delete = jest
      .fn()
      .mockReturnValue({} as RegistryAuth)
    mockRegistryAuthService.create = jest
      .fn()
      .mockReturnValue({} as RegistryAuth)

    const config = await Config.load()

    cmd = new Publish([], config, {
      api: mockFeathersService,
      buildStepService: mockBuildStepService,
      registryAuthService: mockRegistryAuthService,
    } as Services)

    cmd.sendAnalytics = jest.fn()

    cmd.user = {
      username: '',
      email: '',
      id: '',
    }
    cmd.team = {
      id: 'team-id',
      name: 'team-name',
    }
    cmd.state = {
      config: {
        tokens: {
          sessionState: '',
          accessToken: '',
          refreshToken: '',
          idToken: '',
        },
        team: cmd.team,
        user: cmd.user,
      },
    }

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
    mockFeathersService.create = jest.fn().mockReturnValue({ data: {} as Op })

    // MOCK BUILD STEP SERVICE
    const mockBuildStepService = new BuildSteps()
    mockBuildStepService.isGlueCode = jest.fn().mockReturnValue(true)

    mockBuildStepService.buildAndPublishGlueCode = jest
      .fn()
      .mockReturnValue('ops run mock-op')

    mockBuildStepService.isOpRun = jest.fn().mockReturnValue(true)

    const mockRegistryAuthService = new RegistryAuthService()
    mockRegistryAuthService.delete = jest
      .fn()
      .mockReturnValue({} as RegistryAuth)
    mockRegistryAuthService.create = jest
      .fn()
      .mockReturnValue({} as RegistryAuth)

    const config = await Config.load()
    cmd = new Publish([], config, {
      api: mockFeathersService,
      buildStepService: mockBuildStepService,
      registryAuthService: mockRegistryAuthService,
    } as Services)

    cmd.sendAnalytics = jest.fn()

    cmd.user = {
      username: '',
      email: '',
      id: '',
    }
    cmd.team = {
      id: 'team-id',
      name: 'team-name',
    }
    cmd.state = {
      config: {
        tokens: {
          sessionState: '',
          accessToken: '',
          refreshToken: '',
          idToken: '',
        },
        team: cmd.team,
        user: cmd.user,
      },
    }

    cmd.getRegistryAuth = jest.fn().mockReturnValue({} as RegistryAuth)

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
  mockConfig.runHook = jest.fn().mockReturnValue(true)

  const mockImageService = new ImageService()
  mockImageService.checkLocalImage = jest.fn().mockReturnValue(true)

  const mockPublishService = new PublishService()
  mockPublishService.publishOpToRegistry = jest.fn().mockReturnValue({
    data: {
      name: 'mock-op',
    } as Op,
  })

  const mockRegistryAuthService = new RegistryAuthService()
  mockRegistryAuthService.delete = jest.fn().mockReturnValue({} as RegistryAuth)
  mockRegistryAuthService.create = jest.fn().mockReturnValue({} as RegistryAuth)

  cmd = new Publish([], mockConfig, {
    publishService: mockPublishService,
    imageService: mockImageService,
    registryAuthService: mockRegistryAuthService,
  } as Services)
  cmd.team = {
    id: 'team-id',
    name: 'team-name',
  }

  cmd.getRegistryAuth = jest.fn().mockReturnValue({} as RegistryAuth)

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
