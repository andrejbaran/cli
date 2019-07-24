import { ux } from '@cto.ai/sdk'
import { ErrorTemplate } from '~/errors/ErrorTemplate'
import { INTERCOM_EMAIL } from '~/constants/env'
import { terminalText } from '~/utils'
jest.mock('~/errors/ErrorTemplate')

import {
  CouldNotGetLatestVersion,
  FileNotFoundError,
  DockerBuildImageError,
  ConfigError,
  CopyTemplateFilesError,
  MandatoryParameter,
  UndefinedParameter,
  UserUnauthorized,
  CouldNotCreateOp,
  CouldNotCreateWorkflow,
  CouldNotInitializeOp,
  CouldNotGetRegistryToken,
  CouldNotMakeDir,
  InvalidTeamNameFormat,
  APIError,
  AnalyticsError,
  PermissionsError,
  InviteSendingInvite,
  InviteCodeInvalid,
  InvalidInputCharacter,
  MissingRequiredArgument,
  NoResultsFoundForDeletion,
  NoOpsFound,
  NoWorkflowsFound,
  NoStepsFound,
  InvalidStepsFound,
  ImageNotFoundError,
  SignInError,
  NoEmailForReset,
  ResetTokenError,
  SignUpError,
  ImageTagError,
  ImagePushError,
  AlreadySignedOut,
  SignOutError,
} from '~/errors/CustomErrors'
import { errorSource } from '~/constants/errorSource'

const { actionBlue, white } = ux.colors
const message = 'I am a javascript Error object message'
const newError = new Error(message)

const { EXPECTED } = errorSource
const expectedSource = { source: EXPECTED }

const problemContinues = `If the problem continues please contact us at: ${actionBlue(
  INTERCOM_EMAIL,
)}`

const tryAgainOrContact = `Please try again or contact ${actionBlue(
  INTERCOM_EMAIL,
)} and we'll do our best to help.`

describe('Custom Errors', () => {
  beforeEach(() => jest.resetAllMocks())

  it('FileNotFoundError', () => {
    const path = '/fake/path'
    const file = '/fakeFile'
    const err = new FileNotFoundError(newError, path, file)
    expect(err).toBeInstanceOf(FileNotFoundError)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(
        `🤔 Looks like the file ${actionBlue(
          file,
        )} wasn't found in path:\n    ${actionBlue(
          path,
        )}\n    Please verify it exists and try again.`,
      ),
      newError,
      expectedSource,
    )
  })
  it('DockerBuildImageError', () => {
    const err = new DockerBuildImageError(newError)
    expect(err).toBeInstanceOf(DockerBuildImageError)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(
        '🤔 Looks like there was an error when building your image.\n    Please check your Dockerfile and try again.',
      ),
      newError,
      expectedSource,
    )
  })

  it('ConfigError', () => {
    const err = new ConfigError(newError)
    expect(err).toBeInstanceOf(ConfigError)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(
        `❗️Uh-oh, we experienced a problem.\n   Please try signing out and back in again.\n   ${problemContinues}`,
      ),
      newError,
      expectedSource,
    )
  })

  it('CopyTemplateFilesError', () => {
    const err = new CopyTemplateFilesError(newError)
    expect(err).toBeInstanceOf(CopyTemplateFilesError)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(
        `❗We couldn't copy the required files.\n   Please check your directory permissions.\n   ${tryAgainOrContact}`,
      ),
      newError,
      expectedSource,
    )
  })

  it('MandatoryParameter', () => {
    const err = new MandatoryParameter(newError)
    expect(err).toBeInstanceOf(MandatoryParameter)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(
        `❗️Uh-oh, your request failed due to undefined parameters.\n   ${tryAgainOrContact}`,
      ),
      newError,
      expectedSource,
    )
  })

  it('UndefinedParameter', () => {
    const err = new UndefinedParameter(newError)
    expect(err).toBeInstanceOf(UndefinedParameter)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith('Missing parameter', newError)
  })

  it('UserUnauthorized', () => {
    const err = new UserUnauthorized(newError)
    expect(err).toBeInstanceOf(UserUnauthorized)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white("🤚 You don't have permissions for that action. Please try again."),
      newError,
      expectedSource,
    )
  })

  it('CouldNotCreateOp', () => {
    const err = new CouldNotCreateOp(newError)
    expect(err).toBeInstanceOf(CouldNotCreateOp)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white('😅 Uh-oh, this op already exists, please remove it try again.'),
      newError,
      expectedSource,
    )
  })

  it('CouldNotCreateOp', () => {
    const err = new CouldNotCreateWorkflow(newError)
    expect(err).toBeInstanceOf(CouldNotCreateWorkflow)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(
        '😅 Uh-oh, this workflow already exists, please remove it try again.',
      ),
      newError,
      expectedSource,
    )
  })

  it('CouldNotInitializeOp', () => {
    const err = new CouldNotInitializeOp(newError)
    expect(err).toBeInstanceOf(CouldNotInitializeOp)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(
        `❗️Looks like a problem occurred initializing your Op / Workflow.\n   ${tryAgainOrContact}`,
      ),
      newError,
      expectedSource,
    )
  })

  it('CouldNotGetRegistryToken', () => {
    const err = new CouldNotGetRegistryToken(newError)
    expect(err).toBeInstanceOf(CouldNotGetRegistryToken)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(
        '😅Call to registry/token failed, most likely due to invalid access token.',
      ),
      newError,
      expectedSource,
    )
  })

  it('CouldNotMakeDir', () => {
    const path = 'path'
    const err = new CouldNotMakeDir(newError, path)
    expect(err).toBeInstanceOf(CouldNotMakeDir)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(
        `😅 Looks like we weren't able to create a config directory at:\n   ${actionBlue(
          path,
        )}\n   Please check your permissions and try again.`,
      ),
      newError,
      expectedSource,
    )
  })

  it('InvalidTeamNameFormat', () => {
    const err = new InvalidTeamNameFormat(newError)
    expect(err).toBeInstanceOf(InvalidTeamNameFormat)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(
        `❗ Sorry, that's an invalid team name. \n ❗ Team names may contain only letters (case-sensitive), numbers, dashes (-), and underscores (_).`,
      ),
      newError,
      { ...expectedSource, exit: false },
    )
  })

  it('CouldNotGetLatestVersion', () => {
    const err = new CouldNotGetLatestVersion(newError)
    expect(err).toBeInstanceOf(CouldNotGetLatestVersion)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      'Call to check version failed, most likely due to internet connection.',
      newError,
      { ...expectedSource, exit: false },
    )
  })

  it('APIError', () => {
    const err = new APIError(newError)
    expect(err).toBeInstanceOf(APIError)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(`❗️ Looks like an API error occured.\n   ${tryAgainOrContact}`),
      newError,
      expectedSource,
    )
  })

  it('AnalyticsError', () => {
    const err = new AnalyticsError(newError)
    expect(err).toBeInstanceOf(AnalyticsError)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      'Analytics error occured',
      newError,
      { exit: false },
    )
  })

  it('PermissionsError', () => {
    const err = new PermissionsError(newError)
    expect(err).toBeInstanceOf(PermissionsError)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(
        `🤚 Uh-oh! You don't have permission to perform this action.\n   Please review your system user permissions and try again.`,
      ),
      newError,
      expectedSource,
    )
  })

  it('InviteSendingInvite', () => {
    const err = new InviteSendingInvite(newError)
    expect(err).toBeInstanceOf(InviteSendingInvite)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white('😅 Uh-oh, the invite failed to send. Please try again.'),
      newError,
      expectedSource,
    )
  })

  it('InviteCodeInvalid', () => {
    const err = new InviteCodeInvalid(newError)
    expect(err).toBeInstanceOf(InviteCodeInvalid)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(
        "😅 Uh-oh, the invite code doesn't seem to be valid. Please check the code and try again.",
      ),
      newError,
      expectedSource,
    )
  })

  it('InvalidInputCharacter', () => {
    const fieldName = 'mockName'
    const err = new InvalidInputCharacter(fieldName)
    expect(err).toBeInstanceOf(InvalidInputCharacter)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(`❗ The ${fieldName} can only contain numbers, letters, -, or _'.`),
      undefined,
      expectedSource,
    )
  })

  it('MissingRequiredArgument', () => {
    const command = 'mock'
    const err = new MissingRequiredArgument(command)
    expect(err).toBeInstanceOf(MissingRequiredArgument)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(
        `✋ This command requires an argument. Run ${terminalText(
          `${command} --help`,
        )} to learn more.`,
      ),
      undefined,
      expectedSource,
    )
  })

  it('NoResultsFoundForDeletion', () => {
    const opOrWorkflow = 'mock'
    const err = new NoResultsFoundForDeletion(opOrWorkflow)
    expect(err).toBeInstanceOf(NoResultsFoundForDeletion)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(
        `🤔 We couldn't find any matches for ${actionBlue(
          opOrWorkflow,
        )}.\n   Please check the name and try again.`,
      ),
      undefined,
      expectedSource,
    )
  })

  it('NoOpsFound', () => {
    const err = new NoOpsFound()
    expect(err).toBeInstanceOf(NoOpsFound)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(`💩 We couldn't find any ops in the ops.yml!`),
      undefined,
      expectedSource,
    )
  })

  it('NoWorkflowsFound', () => {
    const err = new NoWorkflowsFound()
    expect(err).toBeInstanceOf(NoWorkflowsFound)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(`💩 We couldn't find any workflows in the ops.yml!`),
      undefined,
      expectedSource,
    )
  })

  it('NoStepsFound', () => {
    const err = new NoStepsFound()
    expect(err).toBeInstanceOf(NoStepsFound)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(`💩 We couldn't find any workflow steps in the ops.yml!`),
      undefined,
      expectedSource,
    )
  })

  it('InvalidStepsFound', () => {
    const step = 'mock'
    const err = new InvalidStepsFound(step)
    expect(err).toBeInstanceOf(InvalidStepsFound)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(`💩 Workflow step: ${step} is invalid!`),
      undefined,
      expectedSource,
    )
  })

  it('ImageNotFoundError', () => {
    const imageName = 'mock'
    const err = new ImageNotFoundError(imageName)
    expect(err).toBeInstanceOf(ImageNotFoundError)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(
        `🤔 We couldn't find an image with the name ${actionBlue(
          imageName,
        )}.\n   Please select a different one and try again.`,
      ),
      undefined,
      expectedSource,
    )
  })

  it('SignInError', () => {
    const err = new SignInError(newError)
    expect(err).toBeInstanceOf(SignInError)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(
        `🤔 Sorry, we couldn’t find an account with that email or password.\n   Forgot your password? Run ${terminalText(
          'ops account:reset',
        )}`,
      ),
      newError,
      expectedSource,
    )
  })

  it('NoEmailForReset', () => {
    const email = 'mock'
    const err = new NoEmailForReset(newError, email)
    expect(err).toBeInstanceOf(NoEmailForReset)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(
        `😞 Uh-oh, we couldn't find any user associated with ${actionBlue(
          email,
        )}\n    Please Check your email and try again.`,
      ),
      newError,
      expectedSource,
    )
  })

  it('ResetTokenError', () => {
    const err = new ResetTokenError(newError)
    expect(err).toBeInstanceOf(ResetTokenError)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(
        `😅 Looks like there's an issue with that token.\n    Please request a new token by running ${terminalText(
          'ops account:reset',
        )}`,
      ),
      newError,
      expectedSource,
    )
  })

  it('SignUpError', () => {
    const err = new SignUpError(newError)
    expect(err).toBeInstanceOf(SignUpError)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(
        `😅 We couldn't sign you up at this point in time.\n    ${tryAgainOrContact}`,
      ),
      newError,
      expectedSource,
    )
  })

  it('ImageTagError', () => {
    const err = new ImageTagError(newError)
    expect(err).toBeInstanceOf(ImageTagError)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      '❗️ Could not tag image.',
      newError,
    )
  })

  it('ImagePushError', () => {
    const err = new ImagePushError(newError)
    expect(err).toBeInstanceOf(ImagePushError)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      '❗️ Could not push image.',
      newError,
    )
  })

  it('AlreadySignedOut', () => {
    const err = new AlreadySignedOut()
    expect(err).toBeInstanceOf(AlreadySignedOut)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(
        `🤷‍♂️ Looks like you are already signed out.\n    Run ${terminalText(
          'ops account:signin',
        )} to sign back into your account.`,
      ),
      undefined,
      expectedSource,
    )
  })

  it('SignOutError', () => {
    const err = new SignOutError(newError)
    expect(err).toBeInstanceOf(SignOutError)
    expect(ErrorTemplate).toHaveBeenCalledTimes(1)
    expect(ErrorTemplate).toHaveBeenCalledWith(
      white(
        `😅 Uh-oh, we weren't able to sign out up at this point in time.\n    ${tryAgainOrContact}`,
      ),
      newError,
      expectedSource,
    )
  })
})
