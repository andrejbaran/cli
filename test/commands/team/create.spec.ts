import TeamCreate, { CreateInputs } from '~/commands/team/create'
import { FeathersClient } from '~/services/Feathers'
import { InvalidTeamNameFormat } from '~/errors/CustomErrors'
import { createMockTeam } from '../../mocks'
import { Services } from '~/types'

let cmd: TeamCreate
let config
describe('guardAgainstInvalidName', () => {
  test('should return undefined if no name is provided', async () => {
    cmd = new TeamCreate([], config)
    const res = await cmd.guardAgainstInvalidName({ name: undefined })
    expect(res.name).toBeUndefined()
  })

  test('should return name if it is a valid format', async () => {
    const teamName = 'awesome-team-name'
    cmd = new TeamCreate([], config)
    cmd.validateTeamName = jest.fn().mockReturnValue(true)
    const res = await cmd.guardAgainstInvalidName({ name: 'awesome-team-name' })
    expect(cmd.validateTeamName).toBeCalled()
    expect(res.name).toBe(teamName)
  })

  test('should throw an error if invalid format', async () => {
    cmd = new TeamCreate([], config)
    cmd.validateTeamName = jest.fn().mockReturnValue(false)
    await expect(
      cmd.guardAgainstInvalidName({ name: 'badFormat' }),
    ).rejects.toThrow(new InvalidTeamNameFormat(null))
    expect(cmd.validateTeamName).toBeCalled()
  })
})

describe('createTeam', () => {
  test('should successfully create a team in the api', async () => {
    const name = 'FAKE_TEAM_NAME'
    const inputs: Pick<CreateInputs, 'name'> = {
      name,
    }
    const fakeToken = 'FAKETOKEN'
    const mockTeam = createMockTeam({ name })

    const mockFeathersService = new FeathersClient()
    mockFeathersService.create = jest.fn().mockReturnValue({ data: mockTeam })
    cmd = new TeamCreate([], config, { api: mockFeathersService } as Services)
    cmd.accessToken = fakeToken
    const res = await cmd.createTeam(inputs as CreateInputs)
    expect(mockFeathersService.create).toBeCalledWith(
      '/private/teams',
      { name },
      { headers: { Authorization: fakeToken } },
    )
    expect(res.team.name).toBe(mockTeam.name)
  })
  test('should handle errors thrown from the api', async () => {
    const name = 'FAKE_TEAM_NAME'
    const inputs: Pick<CreateInputs, 'name'> = {
      name,
    }
    const fakeToken = 'FAKETOKEN'

    const mockFeathersService = new FeathersClient()
    mockFeathersService.create = jest.fn().mockReturnValue(new Error())
    cmd = new TeamCreate([], config, { api: mockFeathersService } as Services)
    cmd.accessToken = fakeToken
    await expect(cmd.createTeam(inputs as CreateInputs)).rejects.toThrowError(
      new InvalidTeamNameFormat(null),
    )
  })
})

describe('validateTeamName', () => {
  test('should return true if valid format', async () => {
    cmd = new TeamCreate([], config)
    cmd.validateUniqueField = jest.fn().mockReturnValue(true)
    const res = await cmd.validateTeamName('acceptable-name')
    expect(res).toBe(true)
  })

  test('should return a string warning if invalid format', async () => {
    cmd = new TeamCreate([], config)
    const res = await cmd.validateTeamName('$InVaLiD--_FoRm4t!')
    cmd.validateUniqueField = jest.fn().mockReturnValue(true)
    expect(res).toBe(
      'Invalid team name. May contain only letters (case-sensitive), numbers, dashes (-), and underscores (_).',
    )
  })

  test('should return a string warning if name is not unique', async () => {
    cmd = new TeamCreate([], config)
    cmd.validateUniqueField = jest.fn().mockReturnValue(false)
    const res = await cmd.validateTeamName('acceptable-format')
    expect(cmd.validateUniqueField).toBeCalled()
    expect(res).toBe(
      '😞 Sorry this name has already been taken. Try again with a different name.',
    )
  })

  test('should return an Error if anything goes wrong', async () => {
    const name = 'acceptable-format'
    const accessToken = 'token'
    const mockFeathersService = new FeathersClient()
    mockFeathersService.find = jest.fn().mockReturnValue(new Error())
    cmd = new TeamCreate([], config, { api: mockFeathersService } as Services)
    cmd.accessToken = accessToken
    await expect(cmd.validateTeamName(name)).rejects.toThrowError(
      new InvalidTeamNameFormat(null),
    )
    expect(mockFeathersService.find).toBeCalledWith('/private/validate', {
      query: {
        username: name,
      },
      headers: { Authorization: accessToken },
    })
  })
})
