import * as Config from '@oclif/config'
import AccountReset, { ResetInputs } from '~/commands/account/reset'
import { FeathersClient } from '~/services/Feathers'
import { NoEmailForReset, ResetTokenError } from '~/errors/CustomErrors'

let cmd: AccountReset
let config
beforeEach(async () => {
  config = await Config.load()
})
describe('createToken', () => {
  test('should successfully create a reset token in the api', async () => {
    const mockEmail = 'FAKE_EMAIL'
    const fakeToken = 'FAKETOKEN'
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.create = jest
      .fn()
      .mockReturnValue({ data: 'FAKE_RESPONSE' })

    cmd = new AccountReset([], config, mockFeathersService)
    cmd.accessToken = fakeToken
    await expect(cmd.createToken(mockEmail)).resolves.toBe(mockEmail)
    expect(mockFeathersService.create).toHaveBeenCalledWith(`reset`, {
      email: mockEmail,
    })
  })

  test('should throw an error if no data is returned', async () => {
    const mockEmail = 'FAKE_EMAIL'
    const fakeToken = 'FAKETOKEN'
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.create = jest.fn().mockReturnValue({ data: null })

    cmd = new AccountReset([], config, mockFeathersService)
    cmd.accessToken = fakeToken
    await expect(cmd.createToken(mockEmail)).rejects.toThrowError(
      NoEmailForReset,
    )
    expect(mockFeathersService.create).toHaveBeenCalledWith(`reset`, {
      email: mockEmail,
    })
  })

  test('should throw an error if the api rejejects', async () => {
    const mockEmail = 'FAKE_EMAIL'
    const fakeToken = 'FAKETOKEN'
    //MOCK FEATHERS
    const mockFeathersService = new FeathersClient()
    mockFeathersService.create = jest.fn().mockRejectedValue(new Error())

    cmd = new AccountReset([], config, mockFeathersService)
    cmd.accessToken = fakeToken
    await expect(cmd.createToken(mockEmail)).rejects.toThrowError(
      NoEmailForReset,
    )
    expect(mockFeathersService.create).toHaveBeenCalledWith(`reset`, {
      email: mockEmail,
    })
  })
})

describe('resetPassword', () => {
  test('should successfully patch the password in the api', async () => {
    const mockPassword = 'FAKE_PASSWORD'
    const mockToken = 'FAKE_TOKEN'
    const inputs = {
      token: mockToken,
      password: mockPassword,
    }
    const mockFeathersService = new FeathersClient()
    mockFeathersService.patch = jest
      .fn()
      .mockReturnValue({ data: 'FAKE_RESPONSE' })

    cmd = new AccountReset([], config, mockFeathersService)
    cmd.accessToken = mockToken
    await expect(cmd.resetPassword(inputs)).resolves.toBe(inputs)
    expect(mockFeathersService.patch).toHaveBeenCalledWith(`reset`, mockToken, {
      password: mockPassword,
    })
  })

  test('should throw an error if the token is already consumed', async () => {
    const mockPassword = 'FAKE_PASSWORD'
    const mockToken = 'FAKE_TOKEN'
    const tokenConsumed = 'Token already used'
    const inputs = {
      token: mockToken,
      password: mockPassword,
    }
    const mockFeathersService = new FeathersClient()
    mockFeathersService.patch = jest
      .fn()
      .mockRejectedValue({ error: [{ message: tokenConsumed }] })

    cmd = new AccountReset([], config, mockFeathersService)
    cmd.accessToken = mockToken
    await expect(cmd.resetPassword(inputs)).rejects.toThrowError(
      new ResetTokenError(tokenConsumed),
    )
    expect(mockFeathersService.patch).toHaveBeenCalledWith(`reset`, mockToken, {
      password: mockPassword,
    })
  })

  test('should throw an error if the token is expired', async () => {
    const mockPassword = 'FAKE_PASSWORD'
    const mockToken = 'FAKE_TOKEN'
    const tokenExpired = 'Token already expired'
    const inputs = {
      token: mockToken,
      password: mockPassword,
    }
    const mockFeathersService = new FeathersClient()
    mockFeathersService.patch = jest
      .fn()
      .mockRejectedValue({ error: [{ message: tokenExpired }] })

    cmd = new AccountReset([], config, mockFeathersService)
    cmd.accessToken = mockToken
    await expect(cmd.resetPassword(inputs)).rejects.toThrowError(
      new ResetTokenError(tokenExpired),
    )
    expect(mockFeathersService.patch).toHaveBeenCalledWith(`reset`, mockToken, {
      password: mockPassword,
    })
  })
})
