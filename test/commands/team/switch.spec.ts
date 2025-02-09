import * as Config from '@oclif/config'

import TeamSwitch, { SwitchInputs } from '~/commands/team/switch'
import { ConfigError, APIError } from '~/errors/CustomErrors'
import { FeathersClient } from '~/services/Feathers'
import { Services, Tokens } from '~/types'
import { createMockTeam } from '../../mocks'

let cmd: TeamSwitch
let config
let input: SwitchInputs
beforeEach(async () => {
  config = await Config.load()
  input = { config } as SwitchInputs
})
describe('getActiveTeam', () => {
  test('should successfully retrieve active team from configs', async () => {
    const mockTeam = createMockTeam({ name: 'FAKE_TEAM_NAME' })
    cmd = new TeamSwitch([], config)
    cmd.readConfig = jest.fn().mockReturnValue({ team: mockTeam })
    input.config.team = mockTeam
    const res = await cmd.getActiveTeam(input)
    expect(res.activeTeam).toBe(mockTeam)
  })

  test('should throw an error if readConfig does not return a team', async () => {
    cmd = new TeamSwitch([], config)
    cmd.readConfig = jest.fn().mockReturnValue({})
    await expect(cmd.getActiveTeam(input)).rejects.toThrowError(ConfigError)
  })

  test('should throw an error if readConfig throws an error', async () => {
    cmd = new TeamSwitch([], config)
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
    cmd = new TeamSwitch([], config, { api: mockFeathersService } as Services)
    input.config.tokens = { accessToken: mockToken } as Tokens
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
    cmd = new TeamSwitch([], config, { api: mockFeathersService } as Services)
    input.config.tokens = { accessToken: mockToken } as Tokens
    await expect(cmd.getTeamsFromApi({} as SwitchInputs)).rejects.toThrowError(
      new APIError(null),
    )
    // expect(mockFeathersService.find).toBeCalledWith('/private/teams', {
    //   headers: {
    //     Authorization: mockToken,
    //   },
    // })
  })
})
