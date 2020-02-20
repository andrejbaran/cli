import * as Config from '@oclif/config'

import TeamList, { ListInputs } from '~/commands/team/list'
import { ConfigError, APIError } from '~/errors/CustomErrors'
import { FeathersClient } from '~/services/Feathers'
import { Services, Tokens } from '~/types'
import { createMockTeam } from '../../mocks'

let cmd: TeamList
let config
let input: ListInputs
beforeEach(async () => {
  config = await Config.load()
  input = { configs: config } as ListInputs
})
describe('getActiveTeam', () => {
  test('should successfully retrieve active team from configs', async () => {
    const mockTeam = createMockTeam({ name: 'FAKE_TEAM_NAME' })
    cmd = new TeamList([], config)
    cmd.readConfig = jest.fn().mockReturnValue({ team: mockTeam })
    input.configs.team = mockTeam
    const res = await cmd.getActiveTeam(input)
    expect(res.activeTeam).toBe(mockTeam)
  })

  test('should throw an error if readConfig does not return a team', async () => {
    cmd = new TeamList([], config)
    cmd.readConfig = jest.fn().mockReturnValue({})
    await expect(cmd.getActiveTeam(input)).rejects.toThrowError(ConfigError)
  })

  test('should throw an error if readConfig throws an error', async () => {
    cmd = new TeamList([], config)
    cmd.readConfig = jest.fn().mockRejectedValue(new Error())
    await expect(cmd.getActiveTeam(input)).rejects.toThrowError(ConfigError)
  })
})

describe('getTeamsFromApi', () => {
  test('should successfully retrieve teams from the api', async () => {
    const mockTeam = createMockTeam({ name: 'FAKE_TEAM_NAME' })
    const mockToken = 'FAKE_TOKEN'
    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest.fn().mockReturnValue({ data: [mockTeam] })
    cmd = new TeamList([], config, { api: mockFeathersService } as Services)
    input.configs.tokens = { accessToken: mockToken } as Tokens
    const res = await cmd.getTeamsFromApi(input)
    expect(res.teams[0]).toBe(mockTeam)
    expect(mockFeathersService.find).toBeCalledWith('/private/teams', {
      headers: {
        Authorization: mockToken,
      },
    })
  })

  test('should handle errors from the api', async () => {
    const mockToken = 'FAKE_TOKEN'
    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest.fn().mockRejectedValue(new Error())
    cmd = new TeamList([], config, { api: mockFeathersService } as Services)
    input.configs.tokens = { accessToken: mockToken } as Tokens
    await expect(cmd.getTeamsFromApi({} as ListInputs)).rejects.toThrowError(
      new APIError(null),
    )
    // expect(mockFeathersService.find).toBeCalledWith('/private/teams', {
    //   headers: {
    //     Authorization: mockToken,
    //   },
    // })
  })
})
