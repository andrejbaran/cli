import { FeathersClient } from '~/services'
import * as Config from '@oclif/config'
import { SecretListInputs } from '~/types'
import { SecretService } from '~/services'
import { sleep } from '../../utils'
import { createMockTeam, createMockTokens } from '../../mocks'

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

  test('Should return 0 secrets', async () => {
    service = new SecretService()

    const mockSecrets = undefined
    mockFeathersService.find = jest.fn().mockReturnValue({ data: mockSecrets })
    const mockInputs = {
      api: mockFeathersService,
      config: { team: mockTeam, tokens: mockToken },
    }

    const res = await service.getApiSecretsList(mockInputs as SecretListInputs)

    expect(res.secrets).toBeUndefined()
  })

  test('Should return 4 secrets', async () => {
    service = new SecretService()

    const mockSecrets = ['key1', 'key2', 'key3', 'key4']
    mockFeathersService.find = jest.fn().mockReturnValue({ data: mockSecrets })
    const mockInputs = {
      api: mockFeathersService,
      config: { team: mockTeam, tokens: mockToken },
    }

    const res = await service.getApiSecretsList(mockInputs as SecretListInputs)

    expect(res.secrets.length).toEqual(4)
    expect(res.secrets).toEqual(mockSecrets)
  })

  test('Should return secrets', async () => {
    service = new SecretService()

    const mockSecrets = ['key1', 'key2']
    const mockInputs = { secrets: mockSecrets }
    const res = await service.checkDataList(mockInputs as SecretListInputs)

    expect(res.secrets).toEqual(mockSecrets)
  })
})
