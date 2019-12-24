import * as Config from '@oclif/config'
import TeamJoin, { JoinInputs } from '~/commands/team/join'
import { FeathersClient } from '~/services/Feathers'
import { InviteCodeInvalid } from '~/errors/CustomErrors'
import { createMockTeam } from '../../mocks'
import { Services } from '~/types'

let cmd: TeamJoin
let config
beforeEach(async () => {
  config = await Config.load()
})
describe('joinTeam', () => {
  test('should successfully join the team in the api', async () => {
    const mockTeam = createMockTeam({})
    const mockInviteCode = 'FAKE_CODE'
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.create = jest.fn().mockReturnValue({ data: mockTeam })

    const inputs: JoinInputs = {
      inviteCode: mockInviteCode,
      newTeam: mockTeam,
    }
    const fakeToken = 'FAKETOKEN'

    cmd = new TeamJoin([], config, { api: mockFeathersService } as Services)
    cmd.accessToken = fakeToken
    await cmd.joinTeam(inputs)
    expect(mockFeathersService.create).toHaveBeenCalledWith(
      `/private/teams/accept`,
      {
        inviteCode: mockInviteCode,
      },
      {
        headers: {
          Authorization: cmd.accessToken,
        },
      },
    )
  })
  test('should throw an error if no team is returned from the api', async () => {
    const mockTeam = createMockTeam({})
    const mockInviteCode = 'FAKE_CODE'
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.create = jest.fn().mockReturnValue({ data: null })

    const inputs: JoinInputs = {
      inviteCode: mockInviteCode,
      newTeam: mockTeam,
    }
    const fakeToken = 'FAKETOKEN'

    cmd = new TeamJoin([], config, { api: mockFeathersService } as Services)
    cmd.accessToken = fakeToken

    await expect(cmd.joinTeam(inputs)).rejects.toThrowError(
      new InviteCodeInvalid(null),
    )
    expect(mockFeathersService.create).toHaveBeenCalledWith(
      `/private/teams/accept`,
      {
        inviteCode: mockInviteCode,
      },
      {
        headers: {
          Authorization: cmd.accessToken,
        },
      },
    )
  })

  test('should handle errors thrown from the api', async () => {
    const mockTeam = createMockTeam({})
    const mockInviteCode = 'FAKE_CODE'
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.create = jest.fn().mockRejectedValue(new Error())

    const inputs: JoinInputs = {
      inviteCode: mockInviteCode,
      newTeam: mockTeam,
    }
    const fakeToken = 'FAKETOKEN'

    cmd = new TeamJoin([], config, { api: mockFeathersService } as Services)
    cmd.accessToken = fakeToken
    await expect(cmd.joinTeam(inputs)).rejects.toThrowError(
      new InviteCodeInvalid(null),
    )
    expect(mockFeathersService.create).toHaveBeenCalledWith(
      `/private/teams/accept`,
      {
        inviteCode: mockInviteCode,
      },
      {
        headers: {
          Authorization: cmd.accessToken,
        },
      },
    )
  })
})
