import { ux } from '@cto.ai/sdk'

import { errorSource } from '~/constants/errorSource'
import { INTERCOM_EMAIL } from '~/constants/env'
import { ErrorTemplate } from '~/errors/ErrorTemplate'
import { terminalText } from '~/utils'
import Debug from 'debug'

const debug = Debug('ops:CustomErrors')

const expectedSource = {
  source: errorSource.EXPECTED,
}

const { actionBlue, white, dim } = ux.colors

const problemContinues = `If the problem continues please contact us at: ${actionBlue(
  INTERCOM_EMAIL,
)}`

const tryAgainOrContact = `Please try again or contact ${actionBlue(
  INTERCOM_EMAIL,
)} and we'll do our best to help.`

export class FileNotFoundError extends ErrorTemplate {
  constructor(err, path, file) {
    super(
      white(
        `🤔 Looks like the file ${actionBlue(
          file,
        )} wasn't found in path:\n    ${actionBlue(
          path,
        )}\n    Please verify it exists and try again.`,
      ),
      err,
      expectedSource,
    )
  }
}

export class DockerBuildImageError extends ErrorTemplate {
  constructor(err) {
    super(
      white(
        '🤔 Looks like there was an error when building your image.\n    Please check your Dockerfile and try again.',
      ),
      err,
      expectedSource,
    )
  }
}

export class ConfigError extends ErrorTemplate {
  constructor(err) {
    super(
      white(
        `❗️Uh-oh, we experienced a problem.\n   Please try signing out and back in again.\n   ${problemContinues}`,
      ),
      err,
      expectedSource,
    )
  }
}

export class CopyTemplateFilesError extends ErrorTemplate {
  constructor(err) {
    super(
      white(
        `❗We couldn't copy the required files.\n   Please check your directory permissions.\n   ${tryAgainOrContact}`,
      ),
      err,
      expectedSource,
    )
  }
}

export class MandatoryParameter extends ErrorTemplate {
  constructor(err) {
    super(
      white(
        `❗️Uh-oh, your request failed due to undefined parameters.\n   ${tryAgainOrContact}`,
      ),
      err,
      expectedSource,
    )
  }
}

export class UndefinedParameter extends ErrorTemplate {
  constructor(err) {
    super('Missing parameter', err)
  }
}

export class UserUnauthorized extends ErrorTemplate {
  constructor(err) {
    super(
      white("🤚 You don't have permissions for that action. Please try again."),
      err,
      expectedSource,
    )
  }
}

export class CouldNotCreateOp extends ErrorTemplate {
  constructor(err) {
    super(
      white('😅 Uh-oh, this op already exists, please remove it try again.'),
      err,
      expectedSource,
    )
  }
}

export class CouldNotCreateWorkflow extends ErrorTemplate {
  constructor(err) {
    super(
      white(
        '😅 Uh-oh, this workflow already exists, please remove it try again.',
      ),
      err,
      expectedSource,
    )
  }
}

export class CouldNotInitializeOp extends ErrorTemplate {
  constructor(err) {
    super(
      white(
        `❗️Looks like a problem occurred initializing your Op / Workflow.\n   ${tryAgainOrContact}`,
      ),
      err,
      expectedSource,
    )
  }
}

export class CouldNotGetRegistryToken extends ErrorTemplate {
  constructor(err) {
    super(
      white(
        '😅Call to registry/token failed, most likely due to invalid access token.',
      ),
      err,
      expectedSource,
    )
  }
}

export class CouldNotMakeDir extends ErrorTemplate {
  constructor(err, path = '') {
    super(
      white(
        `😅 Looks like we weren't able to create a config directory at:\n   ${actionBlue(
          path,
        )}\n   Please check your permissions and try again.`,
      ),
      err,
      expectedSource,
    )
  }
}

export class InvalidTeamNameFormat extends ErrorTemplate {
  constructor(err) {
    super(
      white(
        `❗ Sorry, that's an invalid team name. \n ❗ Team names may contain only letters (case-sensitive), numbers, dashes (-), and underscores (_).`,
      ),
      err,
      {
        source: errorSource.EXPECTED,
        exit: false,
      },
    )
  }
}

export class CouldNotGetLatestVersion extends ErrorTemplate {
  constructor(err) {
    super(
      'Call to check version failed, most likely due to internet connection.',
      err,
      {
        source: errorSource.EXPECTED,
        exit: false,
      },
    )
  }
}
export class APIError extends ErrorTemplate {
  constructor(err) {
    super(
      white(`❗️ Looks like an API error occurred.\n   ${tryAgainOrContact}`),
      err,
      expectedSource,
    )
  }
}

export class AnalyticsError extends ErrorTemplate {
  constructor(err) {
    super('Analytics error occurred', err, { exit: false })
  }
}

export class PermissionsError extends ErrorTemplate {
  constructor(err) {
    super(
      white(
        `🤚 Uh-oh! You don't have permission to perform this action.\n   Please review your system user permissions and try again.`,
      ),
      err,
      expectedSource,
    )
  }
}

export class InviteSendingInvite extends ErrorTemplate {
  constructor(err) {
    super(
      white('😅 Uh-oh, the invite failed to send. Please try again.'),
      err,
      expectedSource,
    )
  }
}

export class InviteCodeInvalid extends ErrorTemplate {
  constructor(err) {
    super(
      white(
        "😅 Uh-oh, the invite code doesn't seem to be valid. Please check the code and try again.",
      ),
      err,
      expectedSource,
    )
  }
}
export class InvalidInputCharacter extends ErrorTemplate {
  constructor(fieldName: string) {
    super(
      white(`❗ The ${fieldName} can only contain numbers, letters, -, or _'.`),
      undefined,
      expectedSource,
    )
  }
}

export class MissingRequiredArgument extends ErrorTemplate {
  constructor(command: string) {
    super(
      white(
        `✋ This command requires an argument. Run ${terminalText(
          `${command} --help`,
        )} to learn more.`,
      ),
      undefined,
      expectedSource,
    )
  }
}

export class NoResultsFoundForDeletion extends ErrorTemplate {
  constructor(opOrWorkflow: string) {
    super(
      white(
        `🤔 We couldn't find any matches for ${actionBlue(
          opOrWorkflow,
        )}.\n   Please check the name and try again.`,
      ),
      undefined,
      expectedSource,
    )
  }
}

export class DockerPublishNoImageFound extends ErrorTemplate {
  constructor(opName: string, teamName: string) {
    super(
      white(
        `✋ We couldn't find an image for that ${actionBlue(
          opName,
        )}.\n ⚙️  Please build this op for ${actionBlue(
          `${teamName}`,
        )}: ${terminalText(`ops build ${opName}`)}`,
      ),
      undefined,
      expectedSource,
    )
  }
}

export class NoOpsFound extends ErrorTemplate {
  constructor() {
    super(
      white(`💩 We couldn't find any ops in the ops.yml!`),
      undefined,
      expectedSource,
    )
  }
}
export class NoWorkflowsFound extends ErrorTemplate {
  constructor() {
    super(
      white(`💩 We couldn't find any workflows in the ops.yml!`),
      undefined,
      expectedSource,
    )
  }
}

export class NoStepsFound extends ErrorTemplate {
  constructor() {
    super(
      white(`💩 We couldn't find any workflow steps in the ops.yml!`),
      undefined,
      expectedSource,
    )
  }
}

export class InvalidStepsFound extends ErrorTemplate {
  constructor(step: string) {
    super(
      white(`💩 Workflow step: ${step} is invalid!`),
      undefined,
      expectedSource,
    )
  }
}

export class ImageNotFoundError extends ErrorTemplate {
  constructor(imageName: string) {
    super(
      white(
        `🤔 We couldn't find an image with the name ${actionBlue(
          imageName,
        )}.\n   Please select a different one and try again.`,
      ),
      undefined,
      expectedSource,
    )
  }
}

export class SignInError extends ErrorTemplate {
  constructor(err) {
    super(
      white(
        `🤔 Sorry, we couldn’t find an account with that email or password.\n   Forgot your password? Run ${terminalText(
          'ops account:reset',
        )}`,
      ),
      err,
      expectedSource,
    )
  }
}

export class NoEmailForReset extends ErrorTemplate {
  constructor(err, email: string) {
    super(
      white(
        `😞 Uh-oh, we couldn't find any user associated with ${actionBlue(
          email,
        )}\n    Please Check your email and try again.`,
      ),
      err,
      expectedSource,
    )
  }
}

export class ResetTokenError extends ErrorTemplate {
  constructor(err) {
    super(
      white(
        `😅 Looks like there's an issue with that token.\n    Please request a new token by running ${terminalText(
          'ops account:reset',
        )}`,
      ),
      err,
      expectedSource,
    )
  }
}

export class SignUpError extends ErrorTemplate {
  constructor(err) {
    super(
      white(
        `😅 We couldn't sign you up at this point in time.\n    ${tryAgainOrContact}`,
      ),
      err,
      expectedSource,
    )
  }
}

export class ImageTagError extends ErrorTemplate {
  constructor(err) {
    super('❗️ Could not tag image.', err)
  }
}

export class ImagePushError extends ErrorTemplate {
  constructor(err) {
    super('❗️ Could not push image.', err)
  }
}

export class AlreadySignedOut extends ErrorTemplate {
  constructor() {
    super(
      white(
        `🤷‍♂️ Looks like you are already signed out.\n    Run ${terminalText(
          'ops account:signin',
        )} to sign back into your account.`,
      ),
      undefined,
      expectedSource,
    )
  }
}

export class SignOutError extends ErrorTemplate {
  constructor(err) {
    super(
      white(
        `😅 Uh-oh, we weren't able to sign out up at this point in time.\n    ${tryAgainOrContact}`,
      ),
      err,
      expectedSource,
    )
  }
}

export class YamlPortError extends ErrorTemplate {
  constructor(badPort: string) {
    super(
      white(
        `🤔 We're having trouble parsing the port: ${badPort}.\n ${dim(
          'Please enter with the format',
        )} ${actionBlue('{HostPort}:{InternalPort}')}${dim(
          '. For example:',
        )} ${actionBlue('3000:3000')}`,
      ),
      undefined,
      expectedSource,
    )
  }
}

export class SSOError extends ErrorTemplate {
  constructor(message?: string) {
    message && debug(message)
    super(
      white(
        `🤔 We're having trouble signing you in. Please try running ${actionBlue(
          '$ ops account:signin',
        )} again!`,
      ),
      undefined,
      expectedSource,
    )
  }
}

export class TokenExpiredError extends ErrorTemplate {
  constructor() {
    super(
      white(
        `\n⚠️  Sorry your session has expired. \n\n 👨‍💻 You can sign in with ${ux.colors.green(
          '$',
        )} ${ux.colors.callOutCyan('ops account:signin')}`,
      ),
      undefined,
      expectedSource,
    )
  }
}
