import { ux } from '@cto.ai/sdk'

import { errorSource } from '../constants/errorSource'
import { ErrorResponse, ErrorTemplate } from '../errors/ErrorTemplate'

const { EXPECTED } = errorSource

export class FileNotFoundError extends ErrorTemplate {
  constructor(err, path, file) {
    super(`❓ Uh-oh, the file ${file} wasn't found in path ${path}.`, err, {
      source: EXPECTED,
    })
  }
}

export class ReadFileError extends ErrorTemplate {
  constructor(message) {
    super(message)
  }
}

export class DockerBuildImageError extends ErrorTemplate {
  constructor(err) {
    super('Error while building docker image', err)
  }
}

export class ConfigClearError extends ErrorTemplate {
  constructor(err) {
    super('Error while clearing config', err)
  }
}

export class WriteConfigError extends ErrorTemplate {
  constructor(err) {
    super('Error while writing config', err)
  }
}
export class ReadConfigError extends ErrorTemplate {
  constructor(err) {
    super('Error while reading config', err)
  }
}

export class CopyTemplateFilesError extends ErrorTemplate {
  constructor(err) {
    super(
      "❗ We couldn't copy the required files. Check your permissions and try again.",
      err,
    )
  }
}

export class MandatoryParameter extends ErrorTemplate {
  constructor(err) {
    super(
      'Request failed due to undefined parameter. Are you sure the API is configured properly?',
      err,
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
    super('User lacks permissions to fetch that information.', err, {
      source: EXPECTED,
    })
  }
}

export class CouldNotCreateOp extends ErrorTemplate {
  constructor(err) {
    super(
      '🤚 This op already exists, please remove it and republish to update.',
      err,
      {
        source: EXPECTED,
      },
    )
  }
}

export class CouldNotCreateWorkflow extends ErrorTemplate {
  constructor(err) {
    super(
      '🤚 This workflow already exists, please remove it and republish to update.',
      err,
      {
        source: EXPECTED,
      },
    )
  }
}

export class CouldNotInitializeOp extends ErrorTemplate {
  constructor(err) {
    super('Failed to initialize op.', err)
  }
}

export class CouldNotGetRegistryToken extends ErrorTemplate {
  constructor() {
    super(
      'Call to registry/token failed, most likely due to invalid access token.',
    )
  }
}

export class CouldNotMakeDir extends ErrorTemplate {
  constructor() {
    super('Failed to create a directory on host machine.')
  }
}

export class InvalidTeamNameFormat extends ErrorTemplate {
  constructor(err) {
    super(
      `❗ Sorry, that's an invalid team name. \n ❗ Team names may contain only letters (case-sensitive), numbers, dashes (-), and underscores (_).`,
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
    super('API error occured', err)
  }
}

export class AnalyticsError extends ErrorTemplate {
  constructor(err) {
    super('Analytics error occured', err, { exit: false })
  }
}

export class PermissionsError extends ErrorTemplate {
  constructor(err) {
    super(
      `😨 Uh-oh! You don't have permission to perform this action. Please review your system user permissions and try again.`,
      err,
      { source: EXPECTED },
    )
  }
}

export class InviteSendingInvite extends ErrorTemplate {
  constructor(err) {
    super('😞 Uh-oh, the invite failed to send. Please try again.', err)
  }
}

export class InviteCodeInvalid extends ErrorTemplate {
  constructor(err) {
    super(
      "😞 Uh-oh, the invite code doesn't seem to be valid. Please check the code and try again.",
      err,
    )
  }
}
export class InvalidInputCharacter extends ErrorTemplate {
  constructor(fieldName: string) {
    super(
      `❗ The ${fieldName} can only contain numbers, letters, -, or _'`,
      undefined,
      { source: EXPECTED },
    )
  }
}

export class MissingRequiredArgument extends ErrorTemplate {
  constructor(command: string) {
    super(
      `✋ This command requires an argument. Run $ ${command} --help to learn more.`,
      undefined,
      { source: EXPECTED },
    )
  }
}

export class NoResultsFoundForDeletion extends ErrorTemplate {
  constructor(opOrWorkflow: string) {
    super(
      `🤔 We couldn't remove that ${opOrWorkflow} because we couldn't find it in the registry. Please check the name and try again.`,
      undefined,
      { source: EXPECTED },
    )
  }
}

export class DockerPublishNoImageFound extends ErrorTemplate {
  constructor(opName: string, teamName: string) {
    super(
      `✋ We couldn't find an image for that op... \n ⚙️  Please build this op for ${ux.colors.actionBlue(
        `${teamName}`,
      )}: ${ux.colors.successGreen('$')} ${ux.colors.callOutCyan(
        `ops build ${opName}`,
      )}`,
      undefined,
      { source: EXPECTED },
    )
  }
}

export class NoOpsFound extends ErrorTemplate {
  constructor() {
    super(`✋ We couldn't find any ops in the ops.yml!`, undefined, {
      source: EXPECTED,
      exit: true,
    })
  }
}
export class NoWorkflowsFound extends ErrorTemplate {
  constructor() {
    super(`✋ We couldn't find any workflows in the ops.yml!`, undefined, {
      source: EXPECTED,
      exit: true,
    })
  }
}

export class NoStepsFound extends ErrorTemplate {
  constructor() {
    super(`✋ We couldn't find any workflow steps in the ops.yml!`, undefined, {
      source: EXPECTED,
      exit: true,
    })
  }
}

export class InvalidStepsFound extends ErrorTemplate {
  constructor(step: string) {
    super(`✋ Workflow step: ${step} is invalid!`, undefined, {
      source: EXPECTED,
      exit: true,
    })
  }
}

export class ImageNotFoundError extends ErrorTemplate {
  constructor() {
    super(
      "✋ We couldn't find an image with that name. Please select a different one.",
      undefined,
      { source: EXPECTED },
    )
  }
}

export class SignInError extends ErrorTemplate {
  constructor(err: ErrorResponse) {
    super(
      `🤔 Sorry, we couldn’t find an account with that email or password.\nForgot your password? Run ${ux.colors.bold(
        'ops account:reset',
      )}.\n`,
      err,
      {
        source: EXPECTED,
      },
    )
  }
}

export class NoEmailForReset extends ErrorTemplate {
  constructor(err) {
    super(
      "😞 Uh-oh, we couldn't find any user associated with that email address.\nCheck your email and try again.",
      err,
      { source: EXPECTED },
    )
  }
}

export class ResetTokenError extends ErrorTemplate {
  constructor(err) {
    super(
      `😞 ${err}. Please request a new token by running ${ux.colors.italic.dim(
        'ops account:reset.',
      )}`,
      err,
      { source: EXPECTED },
    )
  }
}

export class SignUpError extends ErrorTemplate {
  constructor(err: ErrorResponse) {
    super("🤔 We couldn't sign you up at this point in time.", err, {
      source: EXPECTED,
    })
  }
}

export class ImageTagError extends ErrorTemplate {
  constructor(err: ErrorResponse) {
    super('🤔 Could not tag image.', err, {
      source: EXPECTED,
    })
  }
}

export class ImagePushError extends ErrorTemplate {
  constructor(err: ErrorResponse) {
    super('🤔 Could not tag image.', err, {
      source: EXPECTED,
    })
  }
}

export class AlreadySignedOut extends ErrorTemplate {
  constructor() {
    super(
      `\n🤷‍♂️ You are already signed out. Type \'${ux.colors.actionBlue(
        'ops account:signin',
      )}\' to sign back into your account.`,
      undefined,
      {
        source: EXPECTED,
      },
    )
  }
}

export class SignOutError extends ErrorTemplate {
  constructor(err) {
    super("🤔 We couldn't sign out up at this point in time.", err, {
      source: EXPECTED,
    })
  }
}
