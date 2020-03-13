import Init from '~/commands/init'
import * as fs from 'fs-extra'
import * as Config from '@oclif/config'
import { Services, InitPaths, InitParams } from '~/types'
import { COMMAND, WORKFLOW, OpTypes } from '~/constants/opConfig'
import { AnalyticsService } from '~/services/Analytics'
import { createMockUser, createMockTeam } from '../mocks'

let cmd: Init
let config

beforeEach(async () => {
  config = Config.load()
})

describe('opsInit', () => {
  test('determineTemplate: Ensures it calls the ux prompt library', async () => {
    cmd = new Init([], config, {} as Services)

    const selectedTemplate = COMMAND

    cmd.ux.prompt = jest.fn().mockReturnValue({ templates: selectedTemplate })

    await cmd.determineTemplate({})

    expect(cmd.ux.prompt.mock.calls.length).toBe(2)
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

    expect(results.questions.length).toBe(1)
    expect(results.questions).toContain(testCommandQuestion)
  })

  test('askQuestions', async () => {
    cmd = new Init([], config, {} as Services)
    cmd.ux.prompt = jest.fn().mockReturnValue(true)
    await cmd.askQuestions({ questions: [], templates: [], lang: '' })

    expect(cmd.ux.prompt.mock.calls.length).toBe(1)
  })

  test('_getLanguagesAvailable: Ensures it gets languages and prints in correct order', async () => {
    const tmpDir = require('os').tmpdir()
    const { sep } = require('path')
    const srcdir: string = fs.mkdtempSync(`${tmpDir}${sep}`)

    //prepare the test folder
    // TODO: Implement this with mocking the FS read/write package https://jestjs.io/docs/en/manual-mocks
    let readdirReturnvalue: {
      name: string
      isDirectory: boolean
    }[] = [
      { name: 'Bash', isDirectory: true },
      { name: 'Golang', isDirectory: true },
      { name: 'JavaScript', isDirectory: true },
      { name: 'Python', isDirectory: true },
      { name: '.DS_Store', isDirectory: false },
      { name: 'loss.jpg', isDirectory: false },
    ]
    readdirReturnvalue.forEach(value => {
      if (value.isDirectory) {
        fs.ensureDirSync(`${srcdir}${sep}shared${sep}${value.name}`)
      } else {
        fs.ensureFileSync(`${srcdir}${sep}shared${sep}${value.name}`)
      }
    })

    const cmd: Init = new Init([], config, {} as Services)
    let actual: string[] = await cmd._getLanguagesAvailable(`${srcdir}`)
    const expected: string[] = ['JavaScript', 'Bash', 'Golang', 'Python']

    expect(actual).toEqual(expected)
    fs.remove(srcdir) //cleanup, but don't block other tests
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
        templates: ['command'],
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
      templates: ['command'],
      lang: 'Assembly',
    })

    expect(actual).toEqual(expected)
  })

  test('copyTemplateFiles', async () => {
    // TODO: Implement this with mocking the FS read/write package https://jestjs.io/docs/en/manual-mocks
  })

  test('customizePackageJson', async () => {
    // TODO: Implement this with mocking the FS read/write package https://jestjs.io/docs/en/manual-mocks
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
    cmd = new Init([], config, { analytics: mockAnalyticsService } as Services)

    cmd.getNameAndDescription = jest
      .fn()
      .mockReturnValue({ name: 'mock-name', description: 'mock-description' })
    cmd.accessToken = 'mock-access-token'
    cmd.user = createMockUser({})
    cmd.team = createMockTeam({})

    const initPaths = {} as InitPaths
    const initParams = {} as InitParams
    await cmd.sendAnalytics({ initPaths, initParams })

    expect(cmd.services.analytics.track.mock.calls.length).toBe(1)
  })
})
