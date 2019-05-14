import { ErrorTemplate } from '../../src/errors/ErrorTemplate'
jest.mock('../../src/errors/ErrorTemplate')

import {
  CouldNotGetLatestVersion,
  ReadFileError,
  FileNotFoundError,
  DockerBuildImageError,
  ConfigClearError,
  WriteConfigError,
  CopyTemplateFilesError,
  MandatoryParameter,
  UndefinedParameter,
  UserUnauthorized,
  CouldNotCreateOp,
  CouldNotGetRegistryToken,
  APIError,
  AnalyticsError,
  PermissionsError,
} from '../../src/errors/customErrors'
import { errorSource } from '../../src/constants/errorSource'

const message = 'I am a javascript Error object message'
const newError = new Error(message)

const { EXPECTED } = errorSource

describe('Custom Errors', () => {
  beforeEach(() => jest.resetAllMocks())

  it('FileNotFoundError', async () => {
    const path = '/fake/path'
    const file = '/fakeFile'
    const err = new FileNotFoundError(newError, path, file)
    expect(err).toBeInstanceOf(FileNotFoundError)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      `❓ Uh-oh, the file ${file} wasn't found in path ${path}.`,
      newError,
      { source: EXPECTED },
    )
  })

  it('ReadFileError', async () => {
    const err = new ReadFileError(message)
    expect(err).toBeInstanceOf(ReadFileError)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(message)
  })

  it('DockerBuildImageError', async () => {
    const err = new DockerBuildImageError(newError)
    expect(err).toBeInstanceOf(DockerBuildImageError)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      'Error while building docker image',
      newError,
    )
  })

  it('ConfigClearError', async () => {
    const err = new ConfigClearError(newError)
    expect(err).toBeInstanceOf(ConfigClearError)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      'Error while clearing config',
      newError,
    )
  })

  it('WriteConfigError', async () => {
    const err = new WriteConfigError(newError)
    expect(err).toBeInstanceOf(WriteConfigError)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      'Error while writing config',
      newError,
    )
  })

  it('CopyTemplateFilesError', async () => {
    const err = new CopyTemplateFilesError(newError)
    expect(err).toBeInstanceOf(CopyTemplateFilesError)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      "❗ We couldn't copy the required files. Check your permissions and try again.",
      newError,
    )
  })

  it('MandatoryParameter', async () => {
    const err = new MandatoryParameter(newError)
    expect(err).toBeInstanceOf(MandatoryParameter)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      'Request failed due to undefined parameter. Are you sure the API is configured properly?',
      newError,
    )
  })

  it('UndefinedParameter', async () => {
    const err = new UndefinedParameter(newError)
    expect(err).toBeInstanceOf(UndefinedParameter)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith('Missing parameter', newError)
  })

  it('UserUnauthorized', async () => {
    const err = new UserUnauthorized(newError)
    expect(err).toBeInstanceOf(UserUnauthorized)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      'User lacks permissions to fetch that information.',
      newError,
      { source: EXPECTED },
    )
  })

  it('CouldNotCreateOp', async () => {
    const err = new CouldNotCreateOp(newError)
    expect(err).toBeInstanceOf(CouldNotCreateOp)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      'Failed to publish op. API failed to create a new op.',
      newError,
    )
  })

  it('CouldNotGetRegistryToken', async () => {
    const err = new CouldNotGetRegistryToken()
    expect(err).toBeInstanceOf(CouldNotGetRegistryToken)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      'Call to registry/token failed, most likely due to invalid access token.',
    )
  })

  it('APIError', async () => {
    const err = new APIError(newError)
    expect(err).toBeInstanceOf(APIError)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith('API error occured', newError)
  })

  it('AnalyticsError', async () => {
    const err = new AnalyticsError(newError)
    expect(err).toBeInstanceOf(AnalyticsError)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      'Analytics error occured',
      newError,
      { exit: false },
    )
  })

  it('PermissionsError', async () => {
    const err = new PermissionsError(newError)
    expect(err).toBeInstanceOf(PermissionsError)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      `😨 Uh-oh! You don't have permission to perform this action. Please review your system user permissions and try again.`,
      newError,
      { source: EXPECTED },
    )
  })

  it('CouldNotGetLatestVersion', async () => {
    const err = new CouldNotGetLatestVersion(newError)
    expect(err).toBeInstanceOf(CouldNotGetLatestVersion)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      'Call to check version failed, most likely due to internet connection.',
      newError,
      {
        source: EXPECTED,
        exit: false,
      },
    )
  })
})
