import { ErrorTemplate } from '../errors/ErrorTemplate';
export declare class FileNotFoundError extends ErrorTemplate {
    constructor(err: any, path: any, file: any);
}
export declare class ReadFileError extends ErrorTemplate {
    constructor(message: any);
}
export declare class DockerBuildImageError extends ErrorTemplate {
    constructor(err: any);
}
export declare class ConfigClearError extends ErrorTemplate {
    constructor(err: any);
}
export declare class WriteConfigError extends ErrorTemplate {
    constructor(err: any);
}
export declare class CopyTemplateFilesError extends ErrorTemplate {
    constructor(err: any);
}
export declare class MandatoryParameter extends ErrorTemplate {
    constructor(err: any);
}
export declare class UndefinedParameter extends ErrorTemplate {
    constructor(err: any);
}
export declare class UserUnauthorized extends ErrorTemplate {
    constructor(err: any);
}
export declare class CouldNotCreateOp extends ErrorTemplate {
    constructor(err: any);
}
export declare class CouldNotInitializeOp extends ErrorTemplate {
    constructor(err: any);
}
export declare class CouldNotGetRegistryToken extends ErrorTemplate {
    constructor();
}
export declare class InvalidTeamNameFormat extends ErrorTemplate {
    constructor(err: any);
}
export declare class CouldNotGetLatestVersion extends ErrorTemplate {
    constructor(err: any);
}
export declare class APIError extends ErrorTemplate {
    constructor(err: any);
}
export declare class AnalyticsError extends ErrorTemplate {
    constructor(err: any);
}
export declare class PermissionsError extends ErrorTemplate {
    constructor(err: any);
}
export declare class InviteCodeInvalid extends ErrorTemplate {
    constructor(err: any);
}
export declare class InvalidInputCharacter extends ErrorTemplate {
    constructor(fieldName: string);
}
export declare class MissingRequiredArgument extends ErrorTemplate {
    constructor(command: string);
}
export declare class NoOpFoundForDeletion extends ErrorTemplate {
    constructor();
}
export declare class DockerPublishNoImageFound extends ErrorTemplate {
    constructor(opName: string);
}
export declare class ImageNotFoundError extends ErrorTemplate {
    constructor();
}
export declare class SignUpError extends ErrorTemplate {
    constructor(err: any);
}
