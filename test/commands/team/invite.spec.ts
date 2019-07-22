import * as Config from '@oclif/config'
import TeamInvite, { InviteInputs } from '~/commands/team/invite'
import { FeathersClient } from '~/services/Feathers'
import { InviteSendingInvite } from '~/errors/CustomErrors'
import { createMockTeam, createMockInvite } from '../../mocks'

let cmd: TeamInvite
let config
beforeEach(async () => {
  config = await Config.load()
})
describe('inviteUserToTeam', () => {
  test('should successfully create invites in the api', async () => {
    const fakeEmail = 'FAKE_EMAIL'
    const mockInvite = createMockInvite({ email: 'FAKE_EMAIL' })
    const mockTeam = createMockTeam({ id: 'FAKE_ID', name: 'FAKE_TEAM_NAME' })
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.create = jest.fn()
    mockFeathersService.create.mockReturnValue({
      data: mockInvite,
    })

    const inputs: InviteInputs = {
      team: mockTeam,
      inviteesArray: [fakeEmail],
    }
    const fakeToken = 'FAKETOKEN'

    cmd = new TeamInvite([], config, mockFeathersService)
    cmd.accessToken = fakeToken
    await cmd.inviteUserToTeam(inputs)
    expect(mockFeathersService.create).toHaveBeenCalledWith(
      `teams/${mockTeam.id}/invites`,
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
    const fakeEmail = 'FAKE_EMAIL'
    const mockTeam = createMockTeam({ id: 'FAKE_ID', name: 'FAKE_TEAM_NAME' })
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.create = jest.fn()
    mockFeathersService.create.mockRejectedValue(new Error())

    const inputs: InviteInputs = {
      team: mockTeam,
      inviteesArray: [fakeEmail],
    }

    cmd = new TeamInvite([], config, mockFeathersService)
    await expect(cmd.inviteUserToTeam(inputs)).rejects.toThrow(
      new InviteSendingInvite(''),
    )
  })
})
