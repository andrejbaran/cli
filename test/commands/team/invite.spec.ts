import * as Config from '@oclif/config'
import TeamInvite, { InviteInputs } from '~/commands/team/invite'
import { FeathersClient } from '~/services/Feathers'
import { InviteSendingInvite } from '~/errors/CustomErrors'
import { createMockTeam, createMockInvite, createMockConfig } from '../../mocks'
import { Services } from '~/types'

let cmd: TeamInvite
let config
beforeEach(async () => {
  config = await Config.load()
})
describe('inviteUserToTeam', () => {
  test('should successfully create invites in the api', async () => {
    const fakeEmail = 'FAKE_VALID_EMAIL@EMAIL.COM'
    const mockInvite = createMockInvite({ email: fakeEmail })
    const mockTeam = createMockTeam({ id: 'FAKE_ID', name: 'FAKE_TEAM_NAME' })
    const mockConfig = createMockConfig({ team: mockTeam })
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.create = jest.fn().mockReturnValue({
      data: mockInvite,
    })

    const inputs = {
      config: mockConfig,
      inviteesArray: [fakeEmail],
    } as InviteInputs
    const fakeToken = 'FAKETOKEN'

    cmd = new TeamInvite([], config, { api: mockFeathersService } as Services)
    cmd.accessToken = fakeToken
    await cmd.inviteUserToTeam(inputs)
    expect(mockFeathersService.create).toHaveBeenCalledWith(
      `/private/teams/${mockTeam.id}/invites`,
      {
        UserOrEmail: inputs.inviteesArray,
      },
      {
        headers: {
          Authorization: cmd.accessToken,
        },
      },
    )
  })
  test('should handle errors thrown by the api', async () => {
    const fakeEmail = 'FAKE_VALID_EMAIL@EMAIL.COM'
    const mockTeam = createMockTeam({ id: 'FAKE_ID', name: 'FAKE_TEAM_NAME' })
    const mockConfig = createMockConfig({ team: mockTeam })
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.create = jest.fn().mockRejectedValue(new Error())

    const inputs = {
      config: mockConfig,
      inviteesArray: [fakeEmail],
    } as InviteInputs

    cmd = new TeamInvite([], config, { api: mockFeathersService } as Services)
    await expect(cmd.inviteUserToTeam(inputs)).rejects.toThrow(
      new InviteSendingInvite(''),
    )
  })

  test('should only send API requests to valid emails', async () => {
    const fakeValidEmail = 'FAKE_VALID_EMAIL@EMAIL.COM'
    const fakeInvalidEmail = 'FAKE_INVALID_EMAIL@FAKE_DOMAIN'
    const mockInvite = createMockInvite({ email: fakeValidEmail })
    const mockTeam = createMockTeam({ id: 'FAKE_ID', name: 'FAKE_TEAM_NAME' })
    const mockConfig = createMockConfig({ team: mockTeam })

    // MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.create = jest.fn().mockReturnValue({
      data: mockInvite,
    })

    const inputs = {
      config: mockConfig,
      inviteesArray: [
        fakeValidEmail,
        fakeInvalidEmail,
        fakeInvalidEmail,
        fakeInvalidEmail,
      ],
    } as InviteInputs

    cmd = new TeamInvite([], config, { api: mockFeathersService } as Services)
    await cmd.inviteUserToTeam(inputs)
    expect(mockFeathersService.create).toHaveBeenCalledWith(
      `/private/teams/${mockTeam.id}/invites`,
      {
        UserOrEmail: [fakeValidEmail],
      },
      {
        headers: {
          Authorization: cmd.accessToken,
        },
      },
    )
  })
})
