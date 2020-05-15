import * as Config from '@oclif/config'
import Publish from '~/commands/publish'
import { PublishInputs } from '~/commands/publish'
import { BuildSteps } from '~/services/BuildSteps'
import { FeathersClient } from '~/services/Feathers'
import { RegistryAuthService } from '~/services/RegistryAuth'
import { ImageService } from '~/services/Image'
import { OpCommand, RegistryAuth, User } from '~/types'
import { OpWorkflow } from '~/types/OpsYml'
import { Services } from '~/types'
import { Publish as PublishService } from '~/services/Publish'
import { createMockWorkflow } from '../mocks'

let cmd: Publish

describe('BuildStep', () => {
  it('should validate all steps for remote workflow', async () => {
    const workflowArray: OpWorkflow[] = [
      createMockWorkflow({
        name: 'mockWorkflow',
        version: 'latest',
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
      opWorkflows: workflowArray,
    } as PublishInputs

    // MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.create = jest
      .fn()
      .mockReturnValue({ data: {} as OpCommand })

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
    cmd.ux = {
      prompt: jest.fn().mockReturnValue({ publishDescription: 'v1 release' }),
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
  // TODO update test once glue_code is re enabled
  // it('should replace all glue code steps with ops run', async () => {
  //   const workflowArray: OpWorkflow[] = [
  //     createMockWorkflow({
  //       name: 'mockWorkflow',
  //       version: 'latest',
  //       remote: true,
  //       steps: [
  //         'ops run op1',
  //         "var stuff1 = 'mock values 1';",
  //         'ops run op2',
  //         'ops run op3',
  //         "var stuff2 = 'mock values 2';",
  //       ],
  //       publishDescription: 'v1 release',
  //       teamID: 'team-id',
  //     }),
  //   ]

  //   const inputs: PublishInputs = {
  //     opWorkflows: workflowArray,
  //     version: '1',
  //   } as PublishInputs

  //   // SPY ON FEATHERS CREATE
  //   const mockFeathersService = new FeathersClient()
  //   mockFeathersService.create = jest
  //     .fn()
  //     .mockReturnValue({ data: {} as OpCommand })

  //   // MOCK BUILD STEP SERVICE
  //   const mockBuildStepService = new BuildSteps()
  //   mockBuildStepService.isGlueCode = jest.fn().mockReturnValue(true)

  //   mockBuildStepService.buildAndPublishGlueCode = jest
  //     .fn()
  //     .mockReturnValue('ops run mock-op')

  //   mockBuildStepService.isOpRun = jest.fn().mockReturnValue(true)

  //   const mockRegistryAuthService = new RegistryAuthService()
  //   mockRegistryAuthService.delete = jest
  //     .fn()
  //     .mockReturnValue({} as RegistryAuth)
  //   mockRegistryAuthService.create = jest
  //     .fn()
  //     .mockReturnValue({} as RegistryAuth)

  //   const config = await Config.load()
  //   cmd = new Publish([], config, {
  //     api: mockFeathersService,
  //     buildStepService: mockBuildStepService,
  //     registryAuthService: mockRegistryAuthService,
  //   } as Services)

  //   cmd.sendAnalytics = jest.fn()

  //   const teamName = 'team-name'

  //   cmd.user = {
  //     username: '',
  //     email: '',
  //     id: '',
  //   }
  //   cmd.team = {
  //     id: 'team-id',
  //     name: teamName,
  //   }
  //   cmd.state = {
  //     config: {
  //       tokens: {
  //         sessionState: '',
  //         accessToken: '',
  //         refreshToken: '',
  //         idToken: '',
  //       },
  //       team: cmd.team,
  //       user: cmd.user,
  //     },
  //   }

  //   cmd.getRegistryAuth = jest.fn().mockReturnValue({} as RegistryAuth)

  //   cmd.ux = {
  //     prompt: jest.fn().mockReturnValue({ publishDescription: 'v1 release' }),
  //   }

  //   await cmd.workflowsPublishLoop(inputs)

  //   expect(mockFeathersService.create).toHaveBeenCalledWith(
  //     `/private/teams/${teamName}/ops`,
  //     createMockWorkflow({
  //       name: 'mockWorkflow',
  //       remote: true,
  //       steps: [
  //         'ops run mock-op',
  //         'ops run mock-op',
  //         'ops run mock-op',
  //         'ops run mock-op',
  //         'ops run mock-op',
  //       ],
  //       publishDescription: 'v1 release',
  //       platformVersion: '1',
  //       teamID: 'team-id',
  //       version: 'latest',
  //     }),
  //     { headers: { Authorization: undefined } },
  //   )

  //   expect(mockFeathersService.create).toHaveBeenCalledTimes(1)
  // })
})

it('should publish ops in a loop', async () => {
  const mockConfig = {} as Config.IConfig
  mockConfig.runHook = jest.fn().mockReturnValue(true)

  const mockImageService = new ImageService()
  mockImageService.checkLocalImage = jest.fn().mockResolvedValue(true)

  const mockPublishService = new PublishService()
  mockPublishService.publishOpToAPI = jest
    .fn()
    .mockResolvedValue({ data: { id: 'published' } })
  mockPublishService.publishOpToRegistry = jest.fn().mockReturnValue({
    data: {
      name: 'mock-op',
    } as OpCommand,
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
  cmd.ux.prompt = jest
    .fn()
    .mockResolvedValue({ publishDescription: 'mockDescription' })
  cmd.sendAnalytics = jest.fn()

  const inputs: PublishInputs = {
    version: 'test',
    opCommands: [
      {
        name: 'mock-op',
        version: 'mockVersion',
        run: 'node test.js',
      } as OpCommand,
    ],
  } as PublishInputs

  await cmd.opsPublishLoop(inputs)

  expect(cmd.ux.prompt).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'input', name: 'publishDescription' }),
  )

  expect(mockImageService.checkLocalImage).toHaveBeenCalledWith(
    expect.stringContaining('/mock-op'),
  )

  expect(mockPublishService.publishOpToAPI).toHaveBeenCalledTimes(1)
  expect(mockPublishService.publishOpToAPI).toHaveBeenCalledWith(
    {
      name: 'mock-op',
      version: 'mockVersion',
      run: 'node test.js',
      type: 'command',
      publishDescription: 'mockDescription',
    },
    'test',
    'team-name',
    cmd.accessToken,
    cmd.services.api,
  )

  expect(mockPublishService.publishOpToRegistry).toHaveBeenCalledTimes(1)
  expect(mockPublishService.publishOpToRegistry).toHaveBeenCalledWith(
    { id: 'published' },
    {},
    'team-name',
    cmd.accessToken,
    cmd.services.registryAuthService,
    cmd.services.api,
    'test',
  )

  expect(cmd.sendAnalytics).toHaveBeenCalledWith('op', { id: 'published' })
})
