import { FeathersClient } from '~/services'
import * as Config from '@oclif/config'
import SecretsDelete from '~/commands/secrets/delete'
import { sleep } from '../../utils'
import {
  createMockTeam,
  createMockTokens,
  createMockConfig,
  createMockState,
} from '../../mocks'
import { APIError, NoSecretsProviderFound } from '~/errors/CustomErrors'
import { ErrorResponse } from '../../../lib/errors/ErrorTemplate'

let cmd: SecretsDelete
let config: Config.IConfig

interface SecretDeleteInput {
  selectedSecret: string
  confirmDelete: boolean
}

beforeEach(async () => {
  config = await Config.load()
})

afterEach(async () => {
  //avoid jest open handle error
  await sleep(500)
})
describe('ops secrets:delete', () => {
  test('should return no secrets provider registered error if there is a corresponding error returned from the backend when deleting the secret', async () => {
    const mockFeathersService = new FeathersClient()
    const mockToken = createMockTokens({})
    const mockTeam = createMockTeam({ id: '12345', name: 'FAKE-TEAM' })
    const mockConfig = createMockConfig({ team: mockTeam, tokens: mockToken })
    const removeError: ErrorResponse = {
      data: null,
      error: [
        {
          code: 403,
          message: 'no secrets provider registered',
          requestID: 'request_id',
        },
      ],
      message: 'error',
      stack: 'error stack',
    }

    mockFeathersService.remove = jest.fn().mockRejectedValue(removeError)

    const inputs: SecretDeleteInput = {
      selectedSecret: 'key-deleted',
      confirmDelete: true,
    }
    cmd = new SecretsDelete([], config, {
      api: mockFeathersService,
    } as Services)
    cmd.state = createMockState({ config: mockConfig })

    await expect(cmd.deleteSecretAPI(inputs)).rejects.toThrow(
      new NoSecretsProviderFound(''),
    )
  })

  test('should return an error if there is a non-200 message from the backend when deleting the secret', async () => {
    const mockFeathersService = new FeathersClient()
    const mockToken = createMockTokens({})
    const mockTeam = createMockTeam({ id: '12345', name: 'FAKE-TEAM' })
    const mockConfig = createMockConfig({ team: mockTeam, tokens: mockToken })
    const removeError: ErrorResponse = {
      data: null,
      error: [{ code: 101, message: 'error_message', requestID: 'request_id' }],
      message: 'error',
      stack: 'error stack',
    }

    mockFeathersService.remove = jest.fn().mockRejectedValue(removeError)

    const inputs: SecretDeleteInput = {
      selectedSecret: 'key-deleted',
      confirmDelete: true,
    }
    cmd = new SecretsDelete([], config, {
      api: mockFeathersService,
    } as Services)
    cmd.state = createMockState({ config: mockConfig })

    await expect(cmd.deleteSecretAPI(inputs)).rejects.toThrow(new APIError(''))
  })
  test('should return the SecretDeleteInput is a 200 message from the backend when deleting the secret', async () => {
    const mockFeathersService = new FeathersClient()
    const mockToken = createMockTokens({})
    const mockTeam = createMockTeam({ id: '12345', name: 'FAKE-TEAM' })
    const mockConfig = createMockConfig({ team: mockTeam, tokens: mockToken })

    mockFeathersService.remove = jest.fn().mockImplementation(() => {
      return true
    })

    const inputs: SecretDeleteInput = {
      selectedSecret: 'key-deleted',
      confirmDelete: true,
    }
    cmd = new SecretsDelete([], config, {
      api: mockFeathersService,
    } as Services)
    cmd.state = createMockState({ config: mockConfig })

    const res = await cmd.deleteSecretAPI(inputs)

    await expect(res).toEqual(inputs)
  })

  test('should return the SecretDeleteInput if the confirmDelete is false', async () => {
    const mockFeathersService = jest.fn()
    const mockToken = createMockTokens({})
    const mockTeam = createMockTeam({ id: '12345', name: 'FAKE-TEAM' })
    const mockConfig = createMockConfig({ team: mockTeam, tokens: mockToken })

    const inputs: SecretDeleteInput = {
      selectedSecret: 'key-deleted',
      confirmDelete: false,
    }
    cmd = new SecretsDelete([], config, {
      api: mockFeathersService,
    } as Services)
    cmd.state = createMockState({ config: mockConfig })

    const res = await cmd.deleteSecretAPI(inputs)
    expect(res).toEqual(inputs)
    expect(mockFeathersService.mock.calls.length).toBe(0)
  })
})
