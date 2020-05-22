import SecretsSet, { SetSecretInputs } from '~/commands/secrets/set'
import { ValueFileError } from '~/errors/CustomErrors'
import * as fs from 'fs-extra'
import { FeathersClient } from '~/services'
import { Services, State } from '~/types'
import { createMockConfig } from '../../mocks'

jest.mock('fs-extra')

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
        `😞 Secret keys can only contain letters, numbers, underscores, hyphens, and periods`,
      )
    }
  })

  describe('resolveFileSecret', () => {
    test('should return its input directly if no filename is provided', async () => {
      const input = {
        config: createMockConfig({}),
        value: 'myvalue',
        key: 'mykey',
      }

      const result = await cmd.resolveFileSecret(input)

      expect(result).toEqual(input)
    })

    test('should return the contents of the file as the value if the filename is provided', async () => {
      jest.resetAllMocks()
      const contents = 'this is my value'
      fs.readFile.mockResolvedValue(contents)

      const input = {
        config: createMockConfig({}),
        key: 'mykey',
        valueFilename: 'myfile',
      }

      const result = await cmd.resolveFileSecret(input)

      expect(result).toEqual({
        config: createMockConfig({}),
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
        config: createMockConfig({}),
        key: 'mykey',
        valueFilename: 'myfile',
      }

      await expect(cmd.resolveFileSecret(input)).rejects.toThrow(ValueFileError)

      expect(fs.readFile).toHaveBeenCalledTimes(1)
      expect(fs.readFile).toHaveBeenCalledWith('myfile', 'utf8')
    })
  })

  describe('promptForSecret', () => {
    test('should not prompt if the key and value are provided on the CLI', async () => {
      cmd.ux.prompt = jest.fn()
      cmd.ux.print = jest.fn()

      const input = {
        config: { team: { name: 'test-team' } },
        value: 'myvalue',
        key: 'mykey',
      }

      const result = await cmd.promptForSecret(input)

      expect(result).toEqual(input)
      expect(cmd.ux.prompt).not.toHaveBeenCalled()
    })

    test('should prompt for only the value if the key is provided', async () => {
      cmd.ux.prompt = jest.fn().mockReturnValue({
        value: 'myvalue',
      })
      cmd.ux.print = jest.fn()

      const input = {
        config: { team: { name: 'test-team' } },
        value: null,
        key: 'mykey',
      }

      const result = await cmd.promptForSecret(input)

      expect(result).toEqual({
        config: input.config,
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

    test('should strip leading and trailing whitespace when prompting for a value', async () => {
      cmd.ux.prompt = jest.fn().mockReturnValue({
        value: ' \t\nmyvalue\n\n\t\n',
      })
      cmd.ux.print = jest.fn()

      const input = {
        config: { team: { name: 'test-team' } },
        value: null,
        key: 'mykey',
      }

      const result = await cmd.promptForSecret(input)

      expect(result).toEqual({
        config: input.config,
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

      const input = {
        config: { team: { name: 'test-team' } },
        value: 'myvalue',
        key: null,
      }

      const result = await cmd.promptForSecret(input)

      expect(result).toEqual({
        config: input.config,
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

      const input = {
        config: { team: { name: 'test-team' } },
        value: null,
        key: null,
      }

      const result = await cmd.promptForSecret(input)

      expect(result).toEqual({
        config: input.config,
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

      const input = {
        config: { team: { name: 'test-team' } },
        value: null,
        key: "we don't expect this to work!",
      }

      const result = await cmd.promptForSecret(input)

      expect(result).toEqual({
        config: input.config,
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

  test('should call teams/${inputs.activeTeam.name}/secrets with correct payload', async () => {
    const name = 'FAKE_TEAM_NAME'
    const inputs: SetSecretInputs = {
      config: { team: { name: 'my-team' } },
      key: 'my-key',
      value: 'my-value',
    }
    const fakeToken = 'FAKETOKEN'

    cmd.accessToken = fakeToken
    await cmd.setSecret(inputs as SetSecretInputs)

    expect(mockFeathersService.create).toBeCalledWith(
      `/private/teams/my-team/secrets`,
      {
        secrets: {
          'my-key': 'my-value',
        },
      },
      { headers: { Authorization: fakeToken } },
    )
  })
})
