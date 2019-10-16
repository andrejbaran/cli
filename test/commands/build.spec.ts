import * as Config from '@oclif/config'
import * as path from 'path'
import Build, { BuildInputs } from '~/commands/build'
import { OpService } from '~/services/Op'

import { MissingRequiredArgument, NoLocalOpsFound } from '~/errors/CustomErrors'
import { createMockOp } from '../mocks'
import { Services } from '~/types'

let cmd: Build
let config
let mockOpPath = './src/templates/shared/'
let mockResolvedOpPath = path.resolve(process.cwd(), mockOpPath)
beforeEach(async () => {
  config = await Config.load()
})

describe('resolvePath', () => {
  test('should return inputs if the path resolves', () => {
    cmd = new Build([], config)
    const res = cmd.resolvePath({ opPath: mockOpPath } as BuildInputs)
    expect(res.opPath).toBe(mockResolvedOpPath)
  })
  test('should return throw an error if no opPath is provided', () => {
    cmd = new Build([], config)
    expect(() => {
      cmd.resolvePath({} as BuildInputs)
    }).toThrowError(MissingRequiredArgument)
  })
})

describe('getOpsFromFileSystem', () => {
  test('should return ops from the parsed yaml', async () => {
    cmd = new Build([], config)
    const testRes = await cmd.getOpsFromFileSystem({
      opPath: mockResolvedOpPath,
    } as BuildInputs)
    expect(testRes.ops.length).toBe(1)
  })
})

describe('executeOpService', () => {
  test('should call the opsBuildLoop in the opService', async () => {
    const mockOpService = new OpService()
    const mockOpsToBuild = [createMockOp({})]
    mockOpService.opsBuildLoop = jest.fn()
    cmd = new Build([], config, { opService: mockOpService } as Services)
    await cmd.executeOpService({
      opPath: mockResolvedOpPath,
      opsToBuild: mockOpsToBuild,
      config,
    } as BuildInputs)
    expect(mockOpService.opsBuildLoop).toBeCalledWith(
      mockOpsToBuild,
      mockResolvedOpPath,
      config,
    )
  })
})
