import Init from '~/commands/init'
import * as fs from 'fs-extra'
import * as Config from '@oclif/config'
import { Services, InitPaths, InitParams } from '~/types'
import { COMMAND, WORKFLOW, OpTypes } from '~/constants/opConfig'
import { AnalyticsService } from '~/services/Analytics'
import { createMockUser, createMockTeam, createMockConfig } from '../mocks'

jest.mock('fs-extra')

let cmd: Init
let config

beforeEach(async () => {
  config = Config.load()
})

describe('opsInit', () => {
  test('determineTemplate: Ensures it calls the ux prompt library', async () => {
    cmd = new Init([], config, {} as Services)

    const selectedLang = 'JavaScript'
    const prompts = {}

    cmd.ux.prompt = jest.fn().mockReturnValue({ lang: selectedLang })
    cmd._getLanguagesAvailable = jest
      .fn()
      .mockReturnValue(['JavaScript', 'Python'])

    let result = await cmd.determineTemplate({ prompts })

    expect(result.prompts).toBe(prompts)
    expect(result.lang).toBe(selectedLang)
    expect(result.templates).toEqual([COMMAND])

    expect(cmd.ux.prompt).toHaveBeenCalledTimes(1)
  })

  test('determineQuestions: Makes sure it filters out the questions properly', async () => {
    cmd = new Init([], config, {} as Services)

    const templates = [COMMAND]
    const commandKey = `${COMMAND}name`
    const workflowKey = `${WORKFLOW}name`
    const testCommandQuestion = {
      name: 'mock-command-question',
    }
    const testWorkflowQuestion = {
      name: 'mock-workflow-question',
    }
    const prompts = {
      [commandKey]: testCommandQuestion,
      [workflowKey]: testWorkflowQuestion,
    }

    const results = cmd.determineQuestions({ prompts, templates, lang: '' })

    expect(results.questions).toEqual([testCommandQuestion])
    expect(results.templates).toEqual(templates)
    expect(results.lang).toBe('')
  })

  test('askQuestions', async () => {
    cmd = new Init([], config, {} as Services)
    const answers = { description: 'abc123' }
    cmd.ux.prompt = jest.fn().mockReturnValue(answers)
    const questions = [
      {
        name: 'mock-question',
      },
    ]

    const results = await cmd.askQuestions({
      questions,
      templates: [],
      lang: '',
      name: null,
    })

    expect(cmd.ux.prompt).toHaveBeenCalledTimes(1)
    expect(cmd.ux.prompt).toHaveBeenCalledWith(questions)
    expect(results.answers).toEqual(answers)
  })

  test('askQuestions_withvalidname', async () => {
    cmd = new Init([], config, {} as Services)
    const answers = { description: 'abc132' }
    cmd.ux.prompt = jest.fn().mockReturnValue(answers)
    const questions = [
      {
        name: 'mock-question',
      },
    ]

    const results = await cmd.askQuestions({
      questions,
      templates: [],
      lang: '',
      name: 'myop-123',
    })

    expect(cmd.ux.prompt).toHaveBeenCalledTimes(1)
    expect(cmd.ux.prompt).toHaveBeenCalledWith([])
    expect(results.answers).toEqual({
      description: 'abc132',
      commandName: 'myop-123',
    })
  })

  test('askQuestions_withinvalidname', async () => {
    cmd = new Init([], config, {} as Services)
    const answers = { commandName: 'nope', description: 'abc132' }
    cmd.ux.prompt = jest.fn().mockReturnValue(answers)
    cmd.log = jest.fn()
    const questions = [
      {
        name: 'mock-question',
      },
    ]

    const results = await cmd.askQuestions({
      questions,
      templates: [],
      lang: '',
      name: 'INVALID!',
    })

    expect(cmd.ux.prompt).toHaveBeenCalledTimes(1)
    expect(cmd.ux.prompt).toHaveBeenCalledWith(questions)
    expect(cmd.log).toHaveBeenCalled()
    expect(results.answers).toEqual(answers)
  })

  test('_getLanguagesAvailable: Ensures it gets languages and prints in correct order', async () => {
    jest.resetAllMocks()
    const entries = [
      '.DS_Store',
      'Bash',
      'Golang',
      'JavaScript',
      'Python',
      'list.txt',
    ]
    fs.readdirSync.mockReturnValue(entries)
    const dirstat = { isDirectory: () => true }
    const filestat = { isDirectory: () => false }
    fs.statSync.mockImplementation(filename =>
      filename.includes('.DS_Store') || filename.includes('list.txt')
        ? filestat
        : dirstat,
    )

    const cmd: Init = new Init([], config, {} as Services)
    const srcdir = 'fake-directory'
    let actual: string[] = await cmd._getLanguagesAvailable(srcdir)
    const expected: string[] = ['JavaScript', 'Bash', 'Golang', 'Python']

    expect(actual).toEqual(expected)
    expect(fs.readdirSync).toHaveBeenCalledWith(`${srcdir}/shared`)
  })

  test('determineInitPaths', async () => {
    cmd = new Init([], config, {} as Services)
    cmd.srcDir = '/testsrcdir'
    cmd.destDir = '/testdestdir'

    const expected = {
      initPaths: {
        sharedDir: `${cmd.srcDir}/shared/Assembly`,
        destDir: `${cmd.destDir}/mock Ops name`,
      },
      initParams: {
        commandName: 'mock Ops name',
        commandDescription: 'mock Ops description',
        commandVersion: '0.1.0',
        templates: [COMMAND],
        lang: 'Assembly',
      },
    }

    const actual: {
      initPaths: {
        sharedDir: string
        destDir: string
      }
      initParams: {
        templates: OpTypes[]
        lang: string
        commandName?: string | undefined
        commandDescription?: string | undefined
        commandVersion?: string | undefined
        workflowName?: string | undefined
        workflowDescription?: string | undefined
        workflowVersion?: string | undefined
        help?: void | undefined
      }
    } = cmd.determineInitPaths({
      answers: {
        commandName: 'mock Ops name',
        commandDescription: 'mock Ops description',
        commandVersion: '0.1.0',
      },
      templates: [COMMAND],
      lang: 'Assembly',
    })

    expect(actual).toEqual(expected)
  })

  test('copyTemplateFiles', async () => {
    cmd = new Init([], config, {} as Services)
    jest.resetAllMocks()

    fs.ensureDir.mockResolvedValue(true)
    fs.copy.mockResolvedValue(true)

    const initPaths = {
      destDir: '/home/cicd/myop',
      sharedDir: 'src/shared/Python',
    }
    const initParams = {}
    const input = { initPaths, initParams }

    const result = await cmd.copyTemplateFiles(input)

    expect(result).toEqual(input)
    expect(fs.ensureDir).toHaveBeenCalledTimes(1)
    expect(fs.ensureDir).toHaveBeenCalledWith(initPaths.destDir)
    expect(fs.copy).toHaveBeenCalledTimes(1)
    expect(fs.copy).toHaveBeenCalledWith(initPaths.sharedDir, initPaths.destDir)
  })

  test('customizePackageJson_nonJS', async () => {
    cmd = new Init([], config, {} as Services)
    jest.resetAllMocks()

    const initPaths = {
      destDir: '/home/cicd/myop',
      sharedDir: 'src/shared/Python',
    }
    const initParams = {
      lang: 'Python',
    }
    const input = { initPaths, initParams }

    const results = await cmd.customizePackageJson(input)

    expect(results).toEqual(input)
    expect(fs.readFileSync).not.toHaveBeenCalled()
    expect(fs.writeFileSync).not.toHaveBeenCalled()
  })

  test('customizePackageJson', async () => {
    cmd = new Init([], config, {} as Services)
    jest.resetAllMocks()

    const inputJson = `{"name": "template", "description": "this is a template", "dependencies": {"@cto.ai/ops": "^2.1.0"}}`
    const outputJson = JSON.stringify(
      {
        name: 'myop',
        description: "it's my op",
        dependencies: { '@cto.ai/ops': '^2.1.0' },
      },
      null,
      2,
    )

    fs.readFileSync.mockReturnValue(inputJson)

    const initPaths = {
      destDir: '/home/cicd/myop',
      sharedDir: 'src/shared/JavaScript',
    }
    const initParams = {
      lang: 'JavaScript',
      commandName: 'myop',
      commandDescription: "it's my op",
    }
    const input = { initPaths, initParams }

    const results = await cmd.customizePackageJson(input)

    expect(results).toEqual(input)
    expect(fs.readFileSync).toHaveBeenCalledWith(
      'src/shared/JavaScript/package.json',
      'utf8',
    )
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '/home/cicd/myop/package.json',
      outputJson,
    )
  })

  test('customizeYaml', async () => {
    // TODO: Implement this with mocking the FS read/write package https://jestjs.io/docs/en/manual-mocks
  })

  test('logMessages', async () => {
    // TODO: Implement this with mocking the FS read/write package https://jestjs.io/docs/en/manual-mocks
  })

  test('sendAnalytics', async () => {
    const mockAnalyticsService = new AnalyticsService()
    mockAnalyticsService.track = jest.fn().mockReturnValue(null)
    const mockConfig = createMockConfig({})
    cmd = new Init([], config, { analytics: mockAnalyticsService } as Services)

    cmd.getNameAndDescription = jest
      .fn()
      .mockReturnValue({ name: 'mock-name', description: 'mock-description' })
    cmd.accessToken = 'mock-access-token'
    cmd.user = createMockUser({})
    cmd.team = createMockTeam({})

    const initPaths = {} as InitPaths
    const initParams = {} as InitParams
    await cmd.sendAnalytics(mockConfig)({ initPaths, initParams })

    expect(cmd.services.analytics.track).toHaveBeenCalledTimes(1)
  })
})
