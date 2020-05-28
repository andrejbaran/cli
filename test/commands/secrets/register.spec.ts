import SecretsRegister, { RegisterInputs } from '~/commands/secrets/register'
import { FeathersClient } from '~/services'
import { Services } from '~/types'
import { createMockConfig } from '../../mocks'

let cmd: SecretsRegister
let config

describe('register secrets', () => {
  const mockFeathersService = new FeathersClient()
  mockFeathersService.create = jest.fn().mockReturnValue({ data: '' })

  cmd = new SecretsRegister([], config, {
    api: mockFeathersService,
  } as Services)

  test('should ensure valid inputs are accepted', async () => {
    expect(await cmd.validateRegisterInput('a valid value')).toBe(true)
  })

  test('should ensure inputs are not left empty', async () => {
    expect(await cmd.validateRegisterInput('')).toBe(
      `😞 Sorry, the value cannot be empty`,
    )
  })

  test('should successfully register a secrets provider in the api', async () => {
    const mockConfig = createMockConfig({ team: { name: 'fakeTeamName' } })
    const inputs: RegisterInputs = {
      config: mockConfig,
      url: 'http://mysecretstore.com',
      token: 'my-token',
    }
    const fakeToken = 'FAKETOKEN'

    cmd.accessToken = fakeToken
    await cmd.registerSecretsProvider(inputs as RegisterInputs)

    expect(mockFeathersService.create).toBeCalledWith(
      `/private/teams/${inputs.config.team.name}/secrets/register`,
      {
        token: inputs.token,
        url: inputs.url,
      },
      { headers: { Authorization: fakeToken } },
    )
  })
})
