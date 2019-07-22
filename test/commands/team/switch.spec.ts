import * as Config from '@oclif/config'

import TeamSwitch from '~/commands/team/switch'
import { ReadConfigError, APIError } from '~/errors/CustomErrors'
import { FeathersClient } from '~/services/Feathers'
import { createMockTeam } from '../../mocks'

let cmd: TeamSwitch
let config
beforeEach(async () => {
  config = await Config.load()
})
describe('getActiveTeam', () => {
  test('should successfully retrieve active team from configs', async () => {
    const mockTeam = createMockTeam({ name: 'FAKE_TEAM_NAME' })
    cmd = new TeamSwitch([], config)
    cmd.readConfig = jest.fn().mockReturnValue({ team: mockTeam })
    const res = await cmd.getActiveTeam()
    expect(res.activeTeam).toBe(mockTeam)
  })

  test('should throw an error if readConfig does not return a team', async () => {
    cmd = new TeamSwitch([], config)
    cmd.readConfig = jest.fn().mockReturnValue({})
    await expect(cmd.getActiveTeam()).rejects.toThrowError(
      new ReadConfigError(null),
    )
  })

  test('should throw an error if readConfig throws an error', async () => {
    cmd = new TeamSwitch([], config)
    cmd.readConfig = jest.fn().mockRejectedValue(new Error())
    await expect(cmd.getActiveTeam()).rejects.toThrowError(
      new ReadConfigError(null),
    )
  })
})

describe('getTeamsFromApi', () => {
  test('should successfully retrieve teams from the api', async () => {
    const mockTeam = createMockTeam({ name: 'FAKE_TEAM_NAME' })
    const mockToken = 'FAKE_TOKEN'
    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest.fn().mockReturnValue({ data: [mockTeam] })
    cmd = new TeamSwitch([], config, mockFeathersService)
    cmd.accessToken = mockToken
    const res = await cmd.getTeamsFromApi({})
    expect(res.teams[0]).toBe(mockTeam)
    expect(mockFeathersService.find).toBeCalledWith('teams', {
      headers: {
        Authorization: mockToken,
      },
    })
  })

  test('should handle errors from the api', async () => {
    const mockToken = 'FAKE_TOKEN'
    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest.fn().mockRejectedValue(new Error())
    cmd = new TeamSwitch([], config, mockFeathersService)
    cmd.accessToken = mockToken
    await expect(cmd.getTeamsFromApi({})).rejects.toThrowError(
      new APIError(null),
    )
    expect(mockFeathersService.find).toBeCalledWith('teams', {
      headers: {
        Authorization: mockToken,
      },
    })
  })
})
