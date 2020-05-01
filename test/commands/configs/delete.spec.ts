import { FeathersClient } from '~/services'
import { Services } from '~/types'
import * as Config from '@oclif/config'
import ConfigsDelete, { ConfigDeleteInput } from '~/commands/configs/delete'
import { sleep } from '../../utils'
import { createMockTeam, createMockTokens } from '../../mocks'
import { APIError } from '~/errors/CustomErrors'

let cmd: ConfigsDelete
let config: Config.IConfig

beforeEach(async () => {
  config = await Config.load()
})

afterEach(async () => {
  await sleep(500)
})

describe('ops configs:delete', () => {
  test('should return an error if there is a non-200 message from the backend when deleting the secret', async () => {
    const mockFeathersService = new FeathersClient()
    const mockToken = createMockTokens({})
    const mockTeam = createMockTeam({ id: '12345', name: 'FAKE-TEAM' })

    mockFeathersService.remove = jest.fn().mockRejectedValue(new Error(''))

    cmd = new ConfigsDelete([], config, {
      api: mockFeathersService,
    } as Services)

    const inputs = {
      selectedConfig: 'key-deleted',
      config: { team: mockTeam, tokens: mockToken },
      confirmDelete: true,
    } as ConfigDeleteInput

    await expect(cmd.deleteConfigAPI(inputs)).rejects.toThrow(new APIError(''))
  })
  test('should return the ConfigDeleteInput if a 200 message from the backend when deleting the secret', async () => {
    const mockFeathersService = new FeathersClient()
    const mockToken = createMockTokens({})
    const mockTeam = createMockTeam({ id: '12345', name: 'FAKE-TEAM' })

    mockFeathersService.remove = jest.fn().mockImplementation(() => {
      return true
    })

    cmd = new ConfigsDelete([], config, {
      api: mockFeathersService,
    } as Services)

    const inputs = {
      config: { team: mockTeam, tokens: mockToken },
      selectedConfig: 'key-deleted',
      confirmDelete: true,
    } as ConfigDeleteInput

    const res = await cmd.deleteConfigAPI(inputs)

    await expect(res).toEqual(inputs)
  })

  test('should return the ConfigDeleteInput if the confirmDelete is false', async () => {
    const mockFeathersService = new FeathersClient()
    const mockToken = createMockTokens({})
    const mockTeam = createMockTeam({ id: '12345', name: 'FAKE-TEAM' })
    mockFeathersService.remove = jest.fn()
    cmd = new ConfigsDelete([], config, {
      api: mockFeathersService,
    } as Services)

    const inputs = {
      config: { team: mockTeam, tokens: mockToken },
      selectedConfig: 'key-deleted',
      confirmDelete: false,
    } as ConfigDeleteInput

    const res = await cmd.deleteConfigAPI(inputs)
    expect(res).toEqual(inputs)
    expect(mockFeathersService.remove).toBeCalledTimes(0)
  })
})
