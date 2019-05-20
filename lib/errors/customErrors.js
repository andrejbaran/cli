"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ErrorTemplate_1 = require("../errors/ErrorTemplate");
const errorSource_1 = require("../constants/errorSource");
const { EXPECTED } = errorSource_1.errorSource;
class FileNotFoundError extends ErrorTemplate_1.ErrorTemplate {
    constructor(err, path, file) {
        super(`❓ Uh-oh, the file ${file} wasn't found in path ${path}.`, err, {
            source: EXPECTED,
        });
    }
}
exports.FileNotFoundError = FileNotFoundError;
class ReadFileError extends ErrorTemplate_1.ErrorTemplate {
    constructor(message) {
        super(message);
    }
}
exports.ReadFileError = ReadFileError;
class DockerBuildImageError extends ErrorTemplate_1.ErrorTemplate {
    constructor(err) {
        super('Error while building docker image', err);
    }
}
exports.DockerBuildImageError = DockerBuildImageError;
class ConfigClearError extends ErrorTemplate_1.ErrorTemplate {
    constructor(err) {
        super('Error while clearing config', err);
    }
}
exports.ConfigClearError = ConfigClearError;
class WriteConfigError extends ErrorTemplate_1.ErrorTemplate {
    constructor(err) {
        super('Error while writing config', err);
    }
}
exports.WriteConfigError = WriteConfigError;
class CopyTemplateFilesError extends ErrorTemplate_1.ErrorTemplate {
    constructor(err) {
        super("❗ We couldn't copy the required files. Check your permissions and try again.", err);
    }
}
exports.CopyTemplateFilesError = CopyTemplateFilesError;
class MandatoryParameter extends ErrorTemplate_1.ErrorTemplate {
    constructor(err) {
        super('Request failed due to undefined parameter. Are you sure the API is configured properly?', err);
    }
}
exports.MandatoryParameter = MandatoryParameter;
class UndefinedParameter extends ErrorTemplate_1.ErrorTemplate {
    constructor(err) {
        super('Missing parameter', err);
    }
}
exports.UndefinedParameter = UndefinedParameter;
class UserUnauthorized extends ErrorTemplate_1.ErrorTemplate {
    constructor(err) {
        super('User lacks permissions to fetch that information.', err, {
            source: EXPECTED,
        });
    }
}
exports.UserUnauthorized = UserUnauthorized;
class CouldNotCreateOp extends ErrorTemplate_1.ErrorTemplate {
    constructor(err) {
        super('Failed to publish op. API failed to create a new op.', err);
    }
}
exports.CouldNotCreateOp = CouldNotCreateOp;
class CouldNotInitializeOp extends ErrorTemplate_1.ErrorTemplate {
    constructor(err) {
        super('Failed to initialize op.', err);
    }
}
exports.CouldNotInitializeOp = CouldNotInitializeOp;
class CouldNotGetRegistryToken extends ErrorTemplate_1.ErrorTemplate {
    constructor() {
        super('Call to registry/token failed, most likely due to invalid access token.');
    }
}
exports.CouldNotGetRegistryToken = CouldNotGetRegistryToken;
class InvalidTeamNameFormat extends ErrorTemplate_1.ErrorTemplate {
    constructor(err) {
        super('❗Sorry, the team name must use letters (case sensitive), numbers (0-9), and underscore (_).', err);
    }
}
exports.InvalidTeamNameFormat = InvalidTeamNameFormat;
class CouldNotGetLatestVersion extends ErrorTemplate_1.ErrorTemplate {
    constructor(err) {
        super('Call to check version failed, most likely due to internet connection.', err, {
            source: errorSource_1.errorSource.EXPECTED,
            exit: false,
        });
    }
}
exports.CouldNotGetLatestVersion = CouldNotGetLatestVersion;
class APIError extends ErrorTemplate_1.ErrorTemplate {
    constructor(err) {
        super('API error occured', err);
    }
}
exports.APIError = APIError;
class AnalyticsError extends ErrorTemplate_1.ErrorTemplate {
    constructor(err) {
        super('Analytics error occured', err, { exit: false });
    }
}
exports.AnalyticsError = AnalyticsError;
class PermissionsError extends ErrorTemplate_1.ErrorTemplate {
    constructor(err) {
        super(`😨 Uh-oh! You don't have permission to perform this action. Please review your system user permissions and try again.`, err, { source: EXPECTED });
    }
}
exports.PermissionsError = PermissionsError;
class InviteCodeInvalid extends ErrorTemplate_1.ErrorTemplate {
    constructor(err) {
        super("😞 Uh-oh, the invite code doesn't seem to be valid. Please check the code and try again.", err);
    }
}
exports.InviteCodeInvalid = InviteCodeInvalid;
class InvalidInputCharacter extends ErrorTemplate_1.ErrorTemplate {
    constructor(fieldName) {
        super(`❗ The ${fieldName} can only contain numbers, letters, -, or _'`, undefined, { source: EXPECTED });
    }
}
exports.InvalidInputCharacter = InvalidInputCharacter;
class MissingRequiredArgument extends ErrorTemplate_1.ErrorTemplate {
    constructor(command) {
        super(`✋ This command requires an argument. Run $ ${command} -h to learn more.`, undefined, { source: EXPECTED });
    }
}
exports.MissingRequiredArgument = MissingRequiredArgument;
class NoOpFoundForDeletion extends ErrorTemplate_1.ErrorTemplate {
    constructor() {
        super(`🤔 We couldn't remove that op because we couldn't find it in the registry. Please check the name and try again.`, undefined, { source: EXPECTED });
    }
}
exports.NoOpFoundForDeletion = NoOpFoundForDeletion;
class DockerPublishNoImageFound extends ErrorTemplate_1.ErrorTemplate {
    constructor(opName) {
        super(`✋ We couldn't find an image for that op. You'll need to build the op by running "$ ops build ${opName}"`, undefined, { source: EXPECTED });
    }
}
exports.DockerPublishNoImageFound = DockerPublishNoImageFound;
class ImageNotFoundError extends ErrorTemplate_1.ErrorTemplate {
    constructor() {
        super("✋ We couldn't find an image with that name. Please select a different one.", undefined, { source: EXPECTED });
    }
}
exports.ImageNotFoundError = ImageNotFoundError;
class SignUpError extends ErrorTemplate_1.ErrorTemplate {
    constructor(err) {
        super("🤔 We couldn't sign you up at this point in time.", err, {
            source: EXPECTED,
        });
    }
}
exports.SignUpError = SignUpError;
