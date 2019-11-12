import { FeathersClient } from '~/services'
import * as Config from '@oclif/config'
import SecretsList from '~/commands/secrets/list'
import { sleep } from '../../utils'
import {
  createMockTeam,
  createMockTokens,
  createMockConfig,
  createMockState,
} from '../../mocks'
import { NoTeamSelected } from '~/errors/CustomErrors'

let cmd: SecretsList
let config: Config.IConfig

beforeEach(async () => {
  config = await Config.load()
})

afterEach(async () => {
  //avoid jest open handle error
  await sleep(500)
})

describe('ops secrets:list', () => {
  test('Should return an error if there is no active team', async () => {
    const mockToken = createMockTokens({})
    const mockTeam = createMockTeam({ id: '', name: '' })
    const mockConfig = createMockConfig({ team: mockTeam, tokens: mockToken })

    cmd = new SecretsList([], config)
    cmd.state = createMockState({ config: mockConfig })

    await expect(cmd.getApiSecrets({} as SecretListInputs)).rejects.toThrow(
      new NoTeamSelected('No team selected'),
    )
  })

  const mockFeathersService = new FeathersClient()
  const mockToken = createMockTokens({})
  const mockTeam = createMockTeam({ id: 'FAKE_ID', name: 'FAKE_TEAM_NAME' })
  const mockConfig = createMockConfig({ team: mockTeam, tokens: mockToken })

  test('Should return 0 secrets', async () => {
    const mockSecrets = undefined

    mockFeathersService.find = jest.fn().mockReturnValue({ data: mockSecrets })

    cmd = new SecretsList([], config, {
      api: mockFeathersService,
    } as Services)
    cmd.state = createMockState({ config: mockConfig })

    const res = await cmd.getApiSecrets({
      activeTeam: mockTeam,
    } as SecretListInputs)

    expect(res.secrets).toBeUndefined()
  })

  test('Should return 4 secrets', async () => {
    const mockSecrets = ['key1', 'key2', 'key3', 'key4']

    mockFeathersService.find = jest.fn().mockReturnValue({ data: mockSecrets })

    cmd = new SecretsList([], config, {
      api: mockFeathersService,
    } as Services)
    cmd.state = createMockState({ config: mockConfig })

    const res = await cmd.getApiSecrets({
      activeTeam: mockTeam,
    } as SecretListInputs)

    expect(res.secrets.length).toEqual(4)
    expect(res.secrets).toEqual(mockSecrets)
  })

  test('Should return secrets', async () => {
    const mockSecrets = ['key1', 'key2']

    cmd = new SecretsList([], config)

    const res = await cmd.checkData({
      secrets: mockSecrets,
    } as SecretListInputs)

    expect(res.secrets).toEqual(mockSecrets)
  })
})
