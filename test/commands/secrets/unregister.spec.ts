import { FeathersClient } from '~/services'
import * as Config from '@oclif/config'
import UnregisterSecret from '~/commands/secrets/unregister'
import { sleep } from '../../utils'
import {
  createMockTeam,
  createMockTokens,
  createMockConfig,
  createMockState,
} from '../../mocks'
import { APIError, NoSecretsProviderFound } from '~/errors/CustomErrors'

let cmd: UnregisterSecret
let config: Config.IConfig

interface UnregisterInput {
  confirmDelete: boolean
}

beforeEach(async () => {
  config = await Config.load()
})

afterEach(async () => {
  //avoid jest open handle error
  await sleep(500)
})
describe('ops secrets:unregister', () => {
  test('should return the SecretDeleteInput if the confirmDelete is false', async () => {
    const mockFeathersService = jest.fn()
    const mockToken = createMockTokens({})
    const mockTeam = createMockTeam({ id: '12345', name: 'FAKE-TEAM' })
    const mockConfig = createMockConfig({ team: mockTeam, tokens: mockToken })

    const inputs: UnregisterInput = {
      selectedSecret: 'key-deleted',
      confirmDelete: false,
    }
    cmd = new UnregisterSecret([], config, {
      api: mockFeathersService,
    } as Services)
    cmd.state = createMockState({ config: mockConfig })

    const res = await cmd.unregisterAPI(inputs)
    expect(res).toEqual(inputs)
    expect(mockFeathersService.mock.calls.length).toBe(0)
  })

  test('should return the sasme inputs if the HTTP request returns 200', async () => {
    const mockFeathersService = new FeathersClient()
    const mockToken = createMockTokens({})
    const mockTeam = createMockTeam({ id: '12345', name: 'FAKE-TEAM' })
    const mockConfig = createMockConfig({ team: mockTeam, tokens: mockToken })

    mockFeathersService.remove = jest.fn().mockImplementation(() => {
      return true
    })

    const inputs: UnregisterInput = {
      confirmDelete: true,
    }
    cmd = new UnregisterSecret([], config, {
      api: mockFeathersService,
    } as Services)
    cmd.state = createMockState({ config: mockConfig })

    const res = await cmd.unregisterAPI(inputs)

    expect(res).toEqual(inputs)
  })

  test('should return `NoSecretsProviderFound` if the HTTP request returns 404', async () => {
    const mockFeathersService = new FeathersClient()
    const mockToken = createMockTokens({})
    const mockTeam = createMockTeam({ id: '12345', name: 'FAKE-TEAM' })
    const mockConfig = createMockConfig({ team: mockTeam, tokens: mockToken })

    mockFeathersService.remove = jest.fn().mockImplementation(() => {
      return Promise.reject({ error: [{ code: 404 }] })
    })

    const inputs: UnregisterInput = {
      confirmDelete: true,
    }
    cmd = new UnregisterSecret([], config, {
      api: mockFeathersService,
    } as Services)
    cmd.state = createMockState({ config: mockConfig })

    await expect(cmd.unregisterAPI(inputs)).rejects.toThrow(
      new NoSecretsProviderFound('no secret provider found'),
    )
  })

  test('should return `APIError` if the HTTP request returns anything else', async () => {
    const mockFeathersService = new FeathersClient()
    const mockToken = createMockTokens({})
    const mockTeam = createMockTeam({ id: '12345', name: 'FAKE-TEAM' })
    const mockConfig = createMockConfig({ team: mockTeam, tokens: mockToken })

    mockFeathersService.remove = jest.fn().mockImplementation(() => {
      return Promise.reject({ error: [{ code: 'X' }] })
    })

    const inputs: UnregisterInput = {
      confirmDelete: true,
    }
    cmd = new UnregisterSecret([], config, {
      api: mockFeathersService,
    } as Services)
    cmd.state = createMockState({ config: mockConfig })

    await expect(cmd.unregisterAPI(inputs)).rejects.toThrow(
      new APIError('API ERROR'),
    )
  })
})
