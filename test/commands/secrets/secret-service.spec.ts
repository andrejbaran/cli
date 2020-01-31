import { FeathersClient } from '~/services'
import * as Config from '@oclif/config'
import { SecretListInputs, ApiService } from '~/types'
import { SecretService } from '~/services'
import { sleep } from '../../utils'
import { createMockTeam, createMockTokens } from '../../mocks'
import {
  NoSecretsProviderFound,
  NoTeamFound,
  TeamUnauthorized,
} from '~/errors/CustomErrors'
import { ErrorResponse } from '~/errors/ErrorTemplate'

let config: Config.IConfig

beforeEach(async () => {
  config = await Config.load()
})

afterEach(async () => {
  //avoid jest open handle error
  await sleep(500)
})

describe('SecretService', () => {
  let service: SecretService

  const mockFeathersService = new FeathersClient()
  const mockToken = createMockTokens({})
  const mockTeam = createMockTeam({ id: 'FAKE_ID', name: 'FAKE_TEAM_NAME' })

  test('Should return `NoSecretsProviderFound` when no secret is provided', async () => {
    service = new SecretService()

    const listError: ErrorResponse = {
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

    mockFeathersService.find = jest.fn().mockRejectedValue(listError)
    const mockInputs = {
      api: mockFeathersService,
      config: { team: mockTeam, tokens: mockToken },
    }

    await expect(
      service.getApiSecretsList(mockInputs as SecretListInputs),
    ).rejects.toThrow(new NoSecretsProviderFound(''))
  })

  test('Should return `TeamUnauthorized` when no secret is provided', async () => {
    service = new SecretService()

    const listError: ErrorResponse = {
      data: null,
      error: [
        {
          code: 401,
          message: 'team not authorized',
          requestID: 'request_id',
        },
      ],
      message: 'error',
      stack: 'error stack',
    }

    mockFeathersService.find = jest.fn().mockRejectedValue(listError)
    const mockInputs = {
      api: mockFeathersService,
      config: { team: mockTeam, tokens: mockToken },
    }

    await expect(
      service.getApiSecretsList(mockInputs as SecretListInputs),
    ).rejects.toThrow(new TeamUnauthorized(''))
  })

  test('Should return `NoTeamFound` when no secret is provided', async () => {
    service = new SecretService()

    const listError: ErrorResponse = {
      data: null,
      error: [
        {
          code: 404,
          message: 'team not found',
          requestID: 'request_id',
        },
      ],
      message: 'error',
      stack: 'error stack',
    }

    mockFeathersService.find = jest.fn().mockRejectedValue(listError)
    const mockInputs = {
      api: mockFeathersService,
      config: { team: mockTeam, tokens: mockToken },
    }

    await expect(
      service.getApiSecretsList(mockInputs as SecretListInputs),
    ).rejects.toThrow(new NoTeamFound(mockInputs.config.team.name))
  })

  test('Should return 0 secrets', async () => {
    service = new SecretService()

    const mockSecret = { storageEngine: 'default storage', secrets: [] }
    mockFeathersService.find = jest.fn().mockReturnValue({ data: [mockSecret] })
    const mockInputs = {
      api: mockFeathersService,
      config: { team: mockTeam, tokens: mockToken },
    }

    const res = await service.getApiSecretsList(mockInputs as SecretListInputs)
    expect(res.secrets.length).toBe(0)
  })

  test('Should return 4 secrets', async () => {
    service = new SecretService()

    const mockSecrets = {
      storageEngine: 'default storage',
      secrets: ['key1', 'key2', 'key3', 'key4'],
    }
    mockFeathersService.find = jest
      .fn()
      .mockReturnValue({ data: [mockSecrets] })
    const mockInputs = {
      api: mockFeathersService,
      config: { team: mockTeam, tokens: mockToken },
    }

    const res = await service.getApiSecretsList(mockInputs as SecretListInputs)

    expect(res.secrets.length).toEqual(4)
    expect(res.secrets).toEqual(mockSecrets.secrets)
  })

  test('Should return secrets', async () => {
    service = new SecretService()

    const mockSecrets = ['key1', 'key2']
    const mockInputs = { secrets: mockSecrets }
    const res = await service.checkDataList(mockInputs as SecretListInputs)

    expect(res.secrets).toEqual(mockSecrets)
  })

  test('should return false if there is any kind of error while checking the team secrets provider', async () => {
    service = new SecretService()

    const listError: ErrorResponse = {
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

    mockFeathersService.find = jest.fn().mockRejectedValue(listError)
    const mockParams = {
      api: mockFeathersService as ApiService,
      config: { team: mockTeam, tokens: mockToken },
    }

    const secretProvider = await service.checkForSecretProviderErrors(
      mockParams.api,
      mockParams.config as Config,
    )

    expect(secretProvider).toBeInstanceOf(Error)
    expect(secretProvider).toBeInstanceOf(NoSecretsProviderFound)
  })

  test('should return true if there is no errors when checking for a team secrets provider', async () => {
    service = new SecretService()

    const mockSecrets = ['key1', 'key2', 'key3', 'key4']
    mockFeathersService.find = jest.fn().mockReturnValue({ data: mockSecrets })
    const mockParams = {
      api: mockFeathersService as ApiService,
      config: { team: mockTeam, tokens: mockToken },
    }

    const secretProvider = await service.checkForSecretProviderErrors(
      mockParams.api,
      mockParams.config as Config,
    )

    expect(secretProvider).toBeUndefined()
  })
})
