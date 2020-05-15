import * as util from 'util'
import hook from '~/hooks/prerun/check-version'
import * as C from '@oclif/config'
jest.mock('~/utils')
import * as utils from '~/utils'
import { Config } from '~/types'

let config

beforeEach(async () => {
  config = await C.load()
  jest.resetAllMocks()
})

describe('Check Version', () => {
  test('should skip version check if command is update', async () => {
    await hook.call({ config }, { Command: { id: 'update' } })

    expect(utils.readConfig).not.toBeCalled()
    expect(utils.getLatestVersion).not.toBeCalled()
    expect(utils.writeConfig).not.toBeCalled()
  })

  test('should skip version check if lastUpdateCheckAt is within 24 hours', async () => {
    utils.readConfig.mockResolvedValue({
      lastUpdateCheckAt: new Date(),
    } as Config)

    await hook.call({ config }, { Command: { id: 'test' } })

    expect(utils.readConfig).toBeCalled()
    expect(utils.getLatestVersion).not.toBeCalled()
    expect(utils.writeConfig).not.toBeCalled()
  })

  test('should check version if lastUpdateCheckAt is null', async () => {
    utils.readConfig.mockResolvedValue({
      lastUpdateCheckAt: undefined,
    } as Config)
    utils.writeConfig.mockResolvedValue()
    utils.getLatestVersion.mockResolvedValue('0.0.0')
    await hook.call({ config, log: util.format }, { Command: { id: 'test' } })
    expect(utils.readConfig).toBeCalled()
    expect(utils.writeConfig).toBeCalled()
    expect(utils.getLatestVersion).toBeCalled()
  })

  test('should check version if lastUpdateCheckAt is past 24 hours', async () => {
    let lastUpdateCheckAt = new Date()
    lastUpdateCheckAt.setDate(lastUpdateCheckAt.getDate() - 2)
    utils.readConfig.mockResolvedValue({ lastUpdateCheckAt } as Config)
    utils.writeConfig.mockResolvedValue()
    utils.getLatestVersion.mockResolvedValue('0.0.0')

    await hook.call({ config, log: util.format }, { Command: { id: 'test' } })
    expect(utils.readConfig).toBeCalled()
    expect(utils.writeConfig).toBeCalled()
    expect(utils.getLatestVersion).toBeCalled()
  })
})
