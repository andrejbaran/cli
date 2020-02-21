import * as Config from '@oclif/config'

import TeamRemove from '~/commands/team/remove'
import {
  ConfigError,
  APIError,
  NoMemberFound,
  NoMembersFound,
  FailedToRemoveMemberFromTeam,
} from '~/errors/CustomErrors'
import { FeathersClient } from '~/services/Feathers'
import { Services, Tokens, TeamRemoveInputs } from '~/types'
import {
  createMockTeam,
  createMockMembership,
  createMockConfig,
  createMockTokens,
  createMockUser,
} from '../../mocks'

let cmd: TeamRemove
let config
beforeEach(async () => {
  config = await Config.load()
})

describe('getActiveTeamCreator', () => {
  test('should successfully retrieve active team creator from api', async () => {
    const mockAccessToken = 'FAKE_ACCESS_TOKEN'
    const mockTeamName = 'FAKE_TEAM_NAME'
    const mockCreatorName = 'FAKE_TEAM_CREATOR'
    const mockTeam = createMockTeam({ name: mockTeamName })
    const mockTokens = createMockTokens({ accessToken: mockAccessToken })
    const mockConfig = createMockConfig({ team: mockTeam, tokens: mockTokens })
    const mockCreator = createMockMembership({ username: mockCreatorName })

    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest.fn().mockReturnValue({ data: mockCreator })

    cmd = new TeamRemove([], config, { api: mockFeathersService } as Services)

    const inputs = { config: mockConfig } as TeamRemoveInputs
    const res = await cmd.getActiveTeamCreator(inputs)

    expect(mockFeathersService.find).toHaveBeenCalledWith(
      `/private/teams/${mockTeamName}/creator`,
      {
        headers: {
          Authorization: mockAccessToken,
        },
      },
    )
    expect(res.creator).toBe(mockCreator)
  })

  test('should handle errors if the api returns an exception', async () => {
    const mockAccessToken = 'FAKE_ACCESS_TOKEN'
    const mockTeamName = 'FAKE_TEAM_NAME'
    const mockTeam = createMockTeam({ name: mockTeamName })
    const mockTokens = createMockTokens({ accessToken: mockAccessToken })
    const mockConfig = createMockConfig({ team: mockTeam, tokens: mockTokens })

    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest.fn().mockRejectedValue(new Error())

    cmd = new TeamRemove([], config, { api: mockFeathersService } as Services)

    const inputs = { config: mockConfig } as TeamRemoveInputs
    await expect(cmd.getActiveTeamCreator(inputs)).rejects.toThrow(
      new APIError(''),
    )
  })
})

describe('getActiveTeamMembers', () => {
  test('should successfully retrieve active team members from api', async () => {
    const mockAccessToken = 'FAKE_ACCESS_TOKEN'
    const mockTeamName = 'FAKE_TEAM_NAME'
    const mockMemberName = 'FAKE_TEAM_MEMBER'
    const mockTeam = createMockTeam({ name: mockTeamName })
    const mockTokens = createMockTokens({ accessToken: mockAccessToken })
    const mockConfig = createMockConfig({ team: mockTeam, tokens: mockTokens })
    const mockMember = createMockMembership({ username: mockMemberName })

    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest.fn().mockReturnValue({ data: [mockMember] })

    cmd = new TeamRemove([], config, { api: mockFeathersService } as Services)

    const inputs = { config: mockConfig } as TeamRemoveInputs
    const res = await cmd.getActiveTeamMembers(inputs)

    expect(mockFeathersService.find).toHaveBeenCalledWith(
      `/private/teams/${mockTeamName}/members`,
      {
        headers: {
          Authorization: mockAccessToken,
        },
      },
    )
    expect(res.members[0]).toBe(mockMember)
  })

  test('should handle errors if the api returns an exception', async () => {
    const mockAccessToken = 'FAKE_ACCESS_TOKEN'
    const mockTeamName = 'FAKE_TEAM_NAME'
    const mockTeam = createMockTeam({ name: mockTeamName })
    const mockTokens = createMockTokens({ accessToken: mockAccessToken })
    const mockConfig = createMockConfig({ team: mockTeam, tokens: mockTokens })

    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest.fn().mockRejectedValue(new Error())

    cmd = new TeamRemove([], config, { api: mockFeathersService } as Services)

    const inputs = { config: mockConfig } as TeamRemoveInputs
    await expect(cmd.getActiveTeamMembers(inputs)).rejects.toThrow(
      new APIError(''),
    )
  })
})

describe('filterOutCreatorAndCurrentUser', () => {
  test('should filter out creator and current user from members', async () => {
    const mockCreatorID = 'FAKE_TEAM_CREATOR'
    const mockUserID = 'FAKE_USER_ID'
    const mockMemberID = 'FAKE_MEMBER_ID'
    const mockUser = createMockUser({ id: mockUserID })
    const mockConfig = createMockConfig({ user: mockUser })
    const mockCreator = createMockMembership({ userId: mockCreatorID })
    const mockUserMember = createMockMembership({ userId: mockUserID })
    const mockMember = createMockMembership({ userId: mockMemberID })

    cmd = new TeamRemove([], config)

    const inputs = {
      config: mockConfig,
      creator: mockCreator,
      members: [mockUserMember, mockCreator, mockMember],
    } as TeamRemoveInputs
    const res = await cmd.filterOutCreatorAndCurrentUser(inputs)

    expect(res.members.length).toBe(1)
    expect(res.members[0].userId).toBe(mockMemberID)
  })
})

describe('checkForArgMember', () => {
  test('should success find memberToRemove by memberArg if provided', async () => {
    const mockMemberUsername = 'FAKE_MEMBER_USERNAME'
    const mockMember = createMockMembership({ username: mockMemberUsername })
    const mockConfig = createMockConfig({})
    const mockMembers = [
      createMockMembership({}),
      createMockMembership({}),
      mockMember,
    ]

    cmd = new TeamRemove([], config)
    const inputs = {
      config: mockConfig,
      members: mockMembers,
      memberArg: mockMemberUsername,
    } as TeamRemoveInputs

    const res = await cmd.checkForArgMember(inputs)
    expect(res.memberToRemove).toBe(mockMember)
  })

  test('should should return if no memberArg provided', async () => {
    cmd = new TeamRemove([], config)
    const inputs = {} as TeamRemoveInputs

    const res = await cmd.checkForArgMember(inputs)
    expect(res.memberToRemove).toBe(undefined)
  })

  test('should error if no members match memberArg', async () => {
    const mockMemberUsername = 'FAKE_MEMBER_USERNAME'
    const mockTeamName = 'FAKE_TEAM_NAME'
    const mockTeam = createMockTeam({ name: mockTeamName })
    const mockConfig = createMockConfig({ team: mockTeam })
    const mockMembers = [createMockMembership({}), createMockMembership({})]

    cmd = new TeamRemove([], config)
    const inputs = {
      config: mockConfig,
      members: mockMembers,
      memberArg: mockMemberUsername,
    } as TeamRemoveInputs

    await expect(cmd.checkForArgMember(inputs)).rejects.toThrow(
      new NoMemberFound(mockMemberUsername, mockTeamName),
    )
  })
})

describe('selectMemberToRemove', () => {
  test('should prompt for memberToRemove if no memberArg match found', async () => {
    const mockMemberUsername = 'FAKE_MEMBER_USERNAME'
    const mockMember = createMockMembership({ username: mockMemberUsername })
    const mockMembers = [createMockMembership({})]
    const mockConfig = createMockConfig({})

    cmd = new TeamRemove([], config)
    cmd.ux.prompt = jest.fn().mockReturnValue({ memberToRemove: mockMember })
    const inputs = {
      config: mockConfig,
      members: mockMembers,
    } as TeamRemoveInputs

    const res = await cmd.selectMemberToRemove(inputs)
    expect(cmd.ux.prompt).toHaveBeenCalled()
    expect(res.memberToRemove).toBe(mockMember)
  })

  test('should error if there are no members', async () => {
    const mockMemberUsername = 'FAKE_MEMBER_USERNAME'
    const mockMember = createMockMembership({ username: mockMemberUsername })
    const mockMembers: unknown = []
    const mockConfig = createMockConfig({})

    cmd = new TeamRemove([], config)
    cmd.ux.prompt = jest.fn().mockReturnValue({ memberToRemove: mockMember })
    const inputs = {
      config: mockConfig,
      members: mockMembers,
    } as TeamRemoveInputs

    await expect(cmd.selectMemberToRemove(inputs)).rejects.toThrow(
      new NoMembersFound(),
    )
  })
})

describe('confirmMemberRemove', () => {
  test('should prompt to confirm removal of member', async () => {
    const mockMembers = [createMockMembership({})]
    const mockConfig = createMockConfig({})

    cmd = new TeamRemove([], config)
    cmd.ux.prompt = jest.fn().mockReturnValue(true)
    const inputs = {
      config: mockConfig,
      members: mockMembers,
    } as TeamRemoveInputs

    const res = await cmd.selectMemberToRemove(inputs)
    expect(cmd.ux.prompt).toHaveBeenCalled()
  })
})

describe('removeMemberFromTeam', () => {
  test('should successfully call the api to remove the member from the team', async () => {
    const mockAccessToken = 'FAKE_ACCESS_TOKEN'
    const mockTeamName = 'FAKE_TEAM_NAME'
    const mockMemberID = 'FAKE_MEMBER_ID'
    const mockTeam = createMockTeam({ name: mockTeamName })
    const mockTokens = createMockTokens({ accessToken: mockAccessToken })
    const mockConfig = createMockConfig({ team: mockTeam, tokens: mockTokens })
    const mockMember = createMockMembership({ userId: mockMemberID })

    const mockFeathersService = new FeathersClient()
    mockFeathersService.remove = jest.fn().mockReturnValue(true)

    cmd = new TeamRemove([], config, { api: mockFeathersService } as Services)

    const inputs = {
      config: mockConfig,
      memberToRemove: mockMember,
    } as TeamRemoveInputs
    const res = await cmd.removeMemberFromTeam(inputs)

    expect(mockFeathersService.remove).toHaveBeenCalledWith(
      `/private/teams/${mockTeamName}/members`,
      mockMemberID,
      {
        headers: {
          Authorization: mockAccessToken,
        },
      },
    )
    expect(res).toBe(inputs)
  })

  test('should handle errors if the api returns an exception', async () => {
    const mockAccessToken = 'FAKE_ACCESS_TOKEN'
    const mockTeamName = 'FAKE_TEAM_NAME'
    const mockMemberName = 'FAKE_MEMBER_NAME'
    const mockTeam = createMockTeam({ name: mockTeamName })
    const mockTokens = createMockTokens({ accessToken: mockAccessToken })
    const mockConfig = createMockConfig({ team: mockTeam, tokens: mockTokens })
    const mockMember = createMockMembership({ username: mockMemberName })
    const mockError = new Error()
    const mockFeathersService = new FeathersClient()
    mockFeathersService.remove = jest.fn().mockRejectedValue(mockError)

    cmd = new TeamRemove([], config, { api: mockFeathersService } as Services)
    const inputs = {
      config: mockConfig,
      memberToRemove: mockMember,
    } as TeamRemoveInputs

    await expect(cmd.removeMemberFromTeam(inputs)).rejects.toThrow(
      new FailedToRemoveMemberFromTeam(mockError, mockMemberName, mockTeamName),
    )
  })
})
