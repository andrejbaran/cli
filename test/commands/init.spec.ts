import Init from '~/commands/init'
import * as Config from '@oclif/config'
import { Services, InitPaths, InitParams } from '~/types'
import { COMMAND, WORKFLOW } from '~/constants/opConfig'
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

    expect(cmd.ux.prompt.mock.calls.length).toBe(1)
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

    const results = cmd.determineQuestions({ prompts, templates })

    expect(results.questions.length).toBe(1)
    expect(results.questions).toContain(testCommandQuestion)
  })

  test('askQuestions', async () => {
    cmd = new Init([], config, {} as Services)
    cmd.ux.prompt = jest.fn().mockReturnValue(true)
    await cmd.askQuestions({ questions: [], templates: [] })

    expect(cmd.ux.prompt.mock.calls.length).toBe(1)
  })

  test('determineInitPaths', async () => {
    // TODO: Implement this with mocking the FS read/write package https://jestjs.io/docs/en/manual-mocks
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
