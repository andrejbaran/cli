import SecretsSet, { SetSecretInputs } from '~/commands/secrets/set'
import { FeathersClient } from '~/services'
import { Services, Team, State } from '~/types'

let cmd: SecretsSet
let config

describe('set secrets', () => {
  let mockFeathersService

  beforeEach(() => {
    mockFeathersService = new FeathersClient()
    mockFeathersService.create = jest.fn().mockReturnValue({ data: '' })
    cmd = new SecretsSet([], config, {
      api: mockFeathersService,
    } as Services)
  })

  test('should ensure valid inputs are accepted', async () => {
    expect(await cmd.validateRegisterInput('a valid value')).toBe(true)
  })

  test('should ensure inputs are not left empty', async () => {
    expect(await cmd.validateRegisterInput('')).toBe(
      `😞 Sorry, the value cannot be empty`,
    )
  })

  test('should call teams/${inputs.activeTeam.name}/secrets with correct payload', async () => {
    const name = 'FAKE_TEAM_NAME'
    const inputs: SetSecretInputs = {
      state: { config: { team: { name: 'my-team' } } } as State,
      key: 'my-key',
      value: 'my-value',
    }
    const fakeToken = 'FAKETOKEN'

    cmd.accessToken = fakeToken
    await cmd.setSecret(inputs as SetSecretInputs)

    expect(mockFeathersService.create).toBeCalledWith(
      `teams/my-team/secrets`,
      {
        secrets: {
          'my-key': 'my-value',
        },
      },
      { headers: { Authorization: fakeToken } },
    )
  })
})
