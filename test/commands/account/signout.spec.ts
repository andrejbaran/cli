import * as Config from '@oclif/config'
import AccountSignout from '~/commands/account/signout'
import { AlreadySignedOut, SignOutError } from '~/errors/CustomErrors'

let cmd: AccountSignout
let config
beforeEach(async () => {
  config = await Config.load()
})
describe('checkForAccessToken', () => {
  test('should return undefined if there is an accessToken', async () => {
    cmd = new AccountSignout([], config)
    cmd.accessToken = 'FAKE_TOKEN'
    await expect(cmd.checkForAccessToken()).resolves.toBe(undefined)
  })
  test('should throw an error if there is no accesstoken', async () => {
    cmd = new AccountSignout([], config)
    await expect(cmd.checkForAccessToken()).rejects.toThrow(AlreadySignedOut)
  })
})

describe('signUserOut', () => {
  test('should return undefined if the user is signed out', async () => {
    cmd = new AccountSignout([], config)
    cmd.clearConfig = jest.fn()
    cmd.readConfig = jest.fn().mockReturnValue({})
    await expect(cmd.signUserOut()).resolves.toBe(undefined)
  })
  test('should throw an error if the accessToken is not cleared', async () => {
    cmd = new AccountSignout([], config)
    cmd.clearConfig = jest.fn()
    cmd.readConfig = jest
      .fn()
      .mockReturnValue({ tokens: { accessToken: 'FakeToken' } })
    await expect(cmd.signUserOut()).rejects.toThrow(SignOutError)
  })
  test('should handle errors if an exception is thrown', async () => {
    cmd = new AccountSignout([], config)
    cmd.clearConfig = jest.fn()
    cmd.readConfig = jest.fn().mockRejectedValue(new Error())
    await expect(cmd.signUserOut()).rejects.toThrow(SignOutError)
  })
})
