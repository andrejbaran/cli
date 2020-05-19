import ConfigsSet, { ConfigSetInputs } from '~/commands/configs/set'
import * as fs from 'fs-extra'
import { FeathersClient } from '~/services'
import { Services, State } from '~/types'
import { ValueFileError } from '~/errors/CustomErrors'
import { createMockConfig } from '../../mocks'

jest.mock('fs-extra')

let cmd: ConfigsSet
let config

describe('set Configs', () => {
  let mockFeathersService

  beforeEach(() => {
    mockFeathersService = new FeathersClient()
    mockFeathersService.create = jest.fn().mockReturnValue({ data: '' })
    cmd = new ConfigsSet([], config, {
      api: mockFeathersService,
    } as Services)
  })

  test('should ensure valid inputs are accepted', async () => {
    expect(await cmd.validateKeyInput('a_valid_value')).toBe(true)
    expect(await cmd.validateValueInput('a valid value')).toBe(true)
  })

  test('should ensure inputs are not left empty', async () => {
    expect(await cmd.validateKeyInput('')).toBe(
      `😞 Sorry, the value cannot be empty`,
    )
    expect(await cmd.validateValueInput('')).toBe(
      `😞 Sorry, the value cannot be empty`,
    )
  })

  test('should ensure keys do not have problematic characters', async () => {
    const cases = ['this has spaces', 'slashes/do/not/work', 'nor:do:colons:']

    for (const testCase of cases) {
      expect(await cmd.validateKeyInput(testCase)).toBe(
        `😞 Config keys can only contain letters, numbers, underscores, hyphens, and periods`,
      )
    }
  })

  describe('resolveFileConfig', () => {
    test('should return its input directly if no filename is provided', async () => {
      const input = {
        value: 'myvalue',
        key: 'mykey',
      } as ConfigSetInputs

      const result = await cmd.resolveFileConfig(input)

      expect(result).toEqual(input)
    })

    test('should return the contents of the file as the value if the filename is provided', async () => {
      jest.resetAllMocks()
      const contents = 'this is my value'
      fs.readFile.mockResolvedValue(contents)

      const input = {
        key: 'mykey',
        valueFilename: 'myfile',
      } as ConfigSetInputs

      const result = await cmd.resolveFileConfig(input)

      expect(result).toEqual({
        key: 'mykey',
        valueFilename: 'myfile',
        value: contents,
      })
      expect(fs.readFile).toHaveBeenCalledTimes(1)
      expect(fs.readFile).toHaveBeenCalledWith('myfile', 'utf8')
    })

    test('should throw on file errors if the filename is provided', async () => {
      jest.resetAllMocks()
      fs.readFile.mockRejectedValue('error!')

      const input = {
        key: 'mykey',
        valueFilename: 'myfile',
      } as ConfigSetInputs

      await expect(cmd.resolveFileConfig(input)).rejects.toThrow(
        new ValueFileError(''),
      )

      expect(fs.readFile).toHaveBeenCalledTimes(1)
      expect(fs.readFile).toHaveBeenCalledWith('myfile', 'utf8')
    })
  })

  describe('promptForConfig', () => {
    test('should not prompt if the key and value are provided on the CLI', async () => {
      cmd.ux.prompt = jest.fn()
      cmd.ux.print = jest.fn()
      const mockConfig = createMockConfig({})

      const input = {
        config: mockConfig,
        value: 'myvalue',
        key: 'mykey',
      } as ConfigSetInputs

      const result = await cmd.promptForConfig(input)

      expect(result).toEqual(input)
      expect(cmd.ux.prompt).not.toHaveBeenCalled()
    })

    test('should prompt for only the value if the key is provided', async () => {
      cmd.ux.prompt = jest.fn().mockReturnValue({
        value: 'myvalue',
      })
      cmd.ux.print = jest.fn()
      const mockConfig = createMockConfig({})

      const input = {
        config: mockConfig,
        value: null,
        key: 'mykey',
      } as ConfigSetInputs

      const result = await cmd.promptForConfig(input)

      expect(result).toEqual({
        config: mockConfig,
        value: 'myvalue',
        key: 'mykey',
      })
      expect(cmd.ux.prompt).toHaveBeenCalledTimes(1)
      expect(cmd.ux.prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'editor',
          name: 'value',
        }),
      )
      expect(cmd.ux.print).toHaveBeenCalled()
    })

    test('should remove trailing whitespace when prompting for the value', async () => {
      cmd.ux.prompt = jest.fn().mockReturnValue({
        value: 'myvalue   \n',
      })
      cmd.ux.print = jest.fn()
      const mockConfig = createMockConfig({})

      const input = {
        config: mockConfig,
        value: null,
        key: 'mykey',
      } as ConfigSetInputs

      const result = await cmd.promptForConfig(input)

      expect(result).toEqual({
        config: mockConfig,
        value: 'myvalue',
        key: 'mykey',
      })
      expect(cmd.ux.prompt).toHaveBeenCalledTimes(1)
      expect(cmd.ux.prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'editor',
          name: 'value',
        }),
      )
      expect(cmd.ux.print).toHaveBeenCalled()
    })

    test('should prompt for only the key if the value is provided', async () => {
      cmd.ux.prompt = jest.fn().mockReturnValue({
        key: 'mykey',
      })
      cmd.ux.print = jest.fn()
      const mockConfig = createMockConfig({})

      const input = {
        config: mockConfig,
        value: 'myvalue',
        key: null,
      } as ConfigSetInputs

      const result = await cmd.promptForConfig(input)

      expect(result).toEqual({
        config: mockConfig,
        value: 'myvalue',
        key: 'mykey',
      })
      expect(cmd.ux.prompt).toHaveBeenCalledTimes(1)
      expect(cmd.ux.prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'input',
          name: 'key',
        }),
      )
      expect(cmd.ux.print).toHaveBeenCalled()
    })

    test('should prompt for the key and value if neither is provided', async () => {
      cmd.ux.prompt = jest.fn().mockReturnValue({
        key: 'mykey',
        value: 'myvalue',
      })
      cmd.ux.print = jest.fn()
      const mockConfig = createMockConfig({})

      const input = {
        config: mockConfig,
        value: null,
        key: null,
      } as ConfigSetInputs

      const result = await cmd.promptForConfig(input)

      expect(result).toEqual({
        config: mockConfig,
        value: 'myvalue',
        key: 'mykey',
      })
      expect(cmd.ux.prompt).toHaveBeenCalledTimes(2)
      expect(cmd.ux.prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'input',
          name: 'key',
        }),
      )
      expect(cmd.ux.prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'editor',
          name: 'value',
        }),
      )
      expect(cmd.ux.print).toHaveBeenCalled()
    })

    test('should prompt for the key and value if the provided key is invalid', async () => {
      cmd.ux.prompt = jest.fn().mockReturnValue({
        key: 'mykey',
        value: 'myvalue',
      })
      cmd.ux.print = jest.fn()
      const mockConfig = createMockConfig({})

      const input = {
        config: mockConfig,
        value: null,
        key: "we don't expect this to work!",
      } as ConfigSetInputs

      const result = await cmd.promptForConfig(input)

      expect(result).toEqual({
        config: mockConfig,
        value: 'myvalue',
        key: 'mykey',
      })
      expect(cmd.ux.prompt).toHaveBeenCalledTimes(2)
      expect(cmd.ux.prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'input',
          name: 'key',
        }),
      )
      expect(cmd.ux.prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'editor',
          name: 'value',
        }),
      )
      expect(cmd.ux.print).toHaveBeenCalledTimes(2)
    })
  })

  test('should call teams/${inputs.activeTeam.name}/Configs with correct payload', async () => {
    const mockConfig = createMockConfig({ team: { id: '', name: 'my-team' } })
    const inputs = {
      config: mockConfig,
      key: 'my-key',
      value: 'my-value',
    } as ConfigSetInputs
    const fakeToken = 'FAKETOKEN'

    cmd.accessToken = fakeToken
    await cmd.setConfig(inputs)

    expect(mockFeathersService.create).toBeCalledWith(
      `/private/teams/my-team/configs`,
      {
        teamConfigs: {
          'my-key': 'my-value',
        },
      },
      { headers: { Authorization: fakeToken } },
    )
  })
})
