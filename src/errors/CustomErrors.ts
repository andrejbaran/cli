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
        '😅 Uh-oh, this workflow already exists, please remove it and try again.',
      ),
      err,
      expectedSource,
    )
  }
}

export class InvalidWorkflowStep extends ErrorTemplate {
  constructor(err) {
    super(
      white(
        '😅 Uh-oh, one of the steps in your workflow is referencing an invalid op.\n Please make sure all steps are referencing ops you have access to.',
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

export class InvalidOpVersionFormat extends ErrorTemplate {
  constructor() {
    super(
      white(
        '❗ Sorry, version is required and can only contain letters, digits, underscores, \n    periods and dashes and must start and end with a letter or a digit',
      ),
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
        `✋ We couldn't find an image for ${actionBlue(
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

export class NoLocalOpsFound extends ErrorTemplate {
  constructor() {
    super(
      white(`💩 We couldn't find any ops in the ops.yml!`),
      undefined,
      expectedSource,
    )
  }
}

export class NoOpsFound extends ErrorTemplate {
  constructor(opName: string, teamName?: string) {
    let message = `💩 We couldn't find any ops with the name ${ux.colors.blueBright(
      opName,
    )}`
    if (teamName) {
      message += ` in the team ${ux.colors.cyan(teamName)}.`
    }
    super(white(message), undefined, expectedSource)
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

export class InvalidGlueCode extends ErrorTemplate {
  constructor() {
    super(
      white(
        `❗️ Looks like a problem occured with on of the workflows steps.\n   ${tryAgainOrContact}`,
      ),
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
    super(
      white(
        `❗️ Oops, seems like there was a problem tagging the image.\n    ${tryAgainOrContact}`,
      ),
      err,
      expectedSource,
    )
  }
}

export class ImagePushError extends ErrorTemplate {
  constructor(err) {
    super(
      white(
        `❗ Oops, seems like there was a problem pushing that image to the registry!\n    ${tryAgainOrContact}`,
      ),
      err,
      expectedSource,
    )
  }
}

export class ImagePullError extends ErrorTemplate {
  constructor(err) {
    super(
      white(
        `❗ Oops, seems like there was a problem pulling that image from the registry!\n    ${tryAgainOrContact}`,
      ),
      err,
      expectedSource,
    )
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

export class CannotDeleteOp extends ErrorTemplate {
  constructor(err) {
    super(
      white(
        `❗ Sorry, we cannot delete the op. \n\n Please verify that it is not being used in some other op.\n`,
      ),
      err,
      expectedSource,
    )
  }
}

export class InvalidOpName extends ErrorTemplate {
  constructor() {
    super(
      white(
        `❗ Sorry, we cannot find that op. Please enter an op with one of the following format:\n- ops run ${ux.colors.bold(
          '@teamName',
        )}/${ux.colors.cyan('opName')}:${ux.colors.reset(
          'version',
        )}\n- ops run ${ux.colors.bold('@teamName')}/${ux.colors.cyan(
          'opName',
        )} ${ux.colors.dim(
          '(for the latest version of the op)',
        )}\n- ops run ${ux.colors.cyan('opName')} ${ux.colors.dim(
          '(for ops you have in your team, or a folder in your current working directory)',
        )}`,
      ),
      undefined,
      expectedSource,
    )
  }
}

export class UnauthorizedtoAccessOp extends ErrorTemplate {
  constructor(err) {
    super(
      white(`❗ Oops, seems like you do not have access to run this op!`),
      err,
      expectedSource,
    )
  }
}

export class IncompleteOpsYml extends ErrorTemplate {
  constructor(message: string) {
    super(
      white(`❗ Sorry, we have difficulty parsing your ops.yml. ${message}`),
      undefined,
      expectedSource,
    )
  }
}

export class InvalidRemoveOpFormat extends ErrorTemplate {
  constructor() {
    super(
      white(
        `❗ Sorry, please provide op you want to remove in a valid format. E.g. \n  ${terminalText(
          'ops remove @team-name/my-command:0.1.0',
        )} - for added ops \n  ${terminalText(
          'ops remove my-command:0.1.0',
        )} - for your own ops \n `,
      ),
      undefined,
      expectedSource,
    )
  }
}
export class OpAlreadyBelongsToTeam extends ErrorTemplate {
  constructor() {
    super(
      white(
        `✋ That's odd. It seems like you are trying to add an op that belongs to your team.`,
      ),
      undefined,
      expectedSource,
    )
  }
}

export class OpNotFoundOpsAdd extends ErrorTemplate {
  constructor() {
    super(
      white(
        `✋ That's odd. It seems like you are trying to add an op that does not exist.`,
      ),
      undefined,
      expectedSource,
    )
  }
}

export class OpAlreadyAdded extends ErrorTemplate {
  constructor() {
    super(
      white(
        `✋ That's odd. It seems like you are trying to add an op that's already added to your team.`,
      ),
      undefined,
      expectedSource,
    )
  }
}

export class VersionIsTaken extends ErrorTemplate {
  constructor() {
    super(
      white(
        `🤔  It seems like the version of the op that you are trying to publish is already taken. Please try again with a different version name.`,
      ),
      undefined,
      expectedSource,
    )
  }
}

export class NoTeamFound extends ErrorTemplate {
  constructor(teamName) {
    super(
      white(
        `🤔 Sorry, we couldn't find a team with name ${ux.colors.cyan(
          teamName,
        )}.`,
      ),
      undefined,
      expectedSource,
    )
  }
}

export class TeamUnauthorized extends ErrorTemplate {
  constructor(err) {
    super(
      white(
        '🤚 Your team lacks the permission for that action. Please try again.',
      ),
      err,
      expectedSource,
    )
  }
}

export class RegisterSecretsProvider extends ErrorTemplate {
  constructor(err) {
    super(
      white('😅 Oops!, we were not able to register the secrets provider'),
      err,
      expectedSource,
    )
  }
}

export class SecretsProviderFound extends ErrorTemplate {
  constructor() {
    super(
      white(
        `😅 It looks like you already got a ${ux.colors.bold(
          'secrets provider',
        )} for this team. You can unregister a secrets provider using  ${terminalText(
          'ops secrets:unregister',
        )}.`,
      ),
      undefined,
      expectedSource,
    )
  }
}
export class NoSecretsProviderFound extends ErrorTemplate {
  constructor(err) {
    super(
      white(
        `😅 Oops!, We are not able to find a secrets provider for this team. You can register a secrets provider using  ${terminalText(
          'ops secrets:register',
        )}.`,
      ),
      err,
      expectedSource,
    )
  }
}

export class SetSecretsProvider extends ErrorTemplate {
  constructor(err) {
    super(
      white('😅 Oops!, we were not able to successfully set the secret'),
      err,
      expectedSource,
    )
  }
}

export class SecretsValuesNotEqual extends ErrorTemplate {
  constructor() {
    super(
      white('🤔 Sorry, the values you have entered do not match!'),
      undefined,
      expectedSource,
    )
  }
}

export class SecretsFlagsRequired extends ErrorTemplate {
  constructor() {
    super(
      white('😅 Oops!, it appears that either flag -k or -v is missing'),
      undefined,
      expectedSource,
    )
  }
}

export class NoSecretFound extends ErrorTemplate {
  constructor() {
    super(
      white(
        `😞  Sorry, we weren't able to select the secret key. ${tryAgainOrContact}`,
      ),
      undefined,
      expectedSource,
    )
  }
}
