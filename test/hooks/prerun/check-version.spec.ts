import * as util from 'util'
import hook from '~/hooks/prerun/check-version'
import * as C from '@oclif/config'
import * as utils from '~/utils'
import { Config } from '~/types'

let config

beforeEach(async () => {
  config = await C.load()
})

describe('Check Version', () => {
  test('should skip version check if lastUpdateCheckAt is within 24 hours', async () => {
    const spyWrite = jest.spyOn(utils, 'writeConfig')
    const spyGetVersion = jest.spyOn(utils, 'getLatestVersion')
    const spyRead = jest.spyOn(utils, 'readConfig')
    spyRead.mockReturnValue(
      new Promise(res => {
        return res({ lastUpdateCheckAt: new Date() } as Config)
      }),
    )
    await hook.call({ config }, { Command: { id: 'test' } })
    expect(spyRead).toBeCalled()
    expect(spyGetVersion).not.toBeCalled()
    expect(spyWrite).not.toBeCalled()
  })

  test('should check version if lastUpdateCheckAt is null', async () => {
    const spyWrite = jest.spyOn(utils, 'writeConfig')
    const spyGetVersion = jest.spyOn(utils, 'getLatestVersion')
    const spyRead = jest.spyOn(utils, 'readConfig')
    spyRead.mockReturnValue(
      new Promise(res => {
        return res({ lastUpdateCheckAt: undefined } as Config)
      }),
    )
    spyWrite.mockReturnValue(
      new Promise(res => {
        return res()
      }),
    )
    spyGetVersion.mockReturnValue(
      new Promise(res => {
        return res('0.0.0')
      }),
    )
    await hook.call({ config, log: util.format }, { Command: { id: 'test' } })
    expect(spyRead).toBeCalled()
    expect(spyWrite).toBeCalled()
    expect(spyGetVersion).toBeCalled()
  })

  test('should check version if lastUpdateCheckAt is past 24 hours', async () => {
    const spyWrite = jest.spyOn(utils, 'writeConfig')
    const spyGetVersion = jest.spyOn(utils, 'getLatestVersion')
    const spyRead = jest.spyOn(utils, 'readConfig')

    spyRead.mockReturnValue(
      new Promise(res => {
        let d = new Date()
        d.setDate(d.getDate() - 2)
        return res({ lastUpdateCheckAt: d } as Config)
      }),
    )
    spyWrite.mockReturnValue(
      new Promise(res => {
        return res()
      }),
    )
    spyGetVersion.mockReturnValue(
      new Promise(res => {
        return res('0.0.0')
      }),
    )
    await hook.call({ config, log: util.format }, { Command: { id: 'test' } })
    expect(spyRead).toBeCalled()
    expect(spyWrite).toBeCalled()
    expect(spyGetVersion).toBeCalled()
  })
})
