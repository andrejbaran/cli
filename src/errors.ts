/**
 * @author: Prachi Singh (prachi@hackcapital.com)
 * @date: Tuesday, 30th April 2019 2:32:54 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Friday, 3rd May 2019 11:18:03 am
 *
 * DESCRIPTION: Custom errors
 *
 * @copyright (c) 2019 Hack Capital
 */

import ErrorTemplate from '@hackcapital/errors'

export class FileNotFoundError extends ErrorTemplate {
  constructor(path) {
    ErrorTemplate.prototype.source = 'UNEXPECTED'
    ErrorTemplate.prototype.exit = true
    super(`Error while finding ops.yml at path ${path}`)
  }
}

export class ReadFileError extends ErrorTemplate {
  constructor(message) {
    ErrorTemplate.prototype.source = 'UNEXPECTED'
    ErrorTemplate.prototype.exit = true
    super(message)
  }
}

export class DockerBuildImageError extends ErrorTemplate {
  constructor(err) {
    ErrorTemplate.prototype.source = 'UNEXPECTED'
    ErrorTemplate.prototype.exit = true
    super('Error while building docker image', {
      extra: err,
    })
  }
}

export class ConfigClearError extends ErrorTemplate {
  constructor(err) {
    ErrorTemplate.prototype.source = 'UNEXPECTED'
    ErrorTemplate.prototype.exit = true
    super('Error while clearing config', { extra: err })
  }
}

export class WriteConfigError extends ErrorTemplate {
  constructor(err) {
    ErrorTemplate.prototype.source = 'UNEXPECTED'
    ErrorTemplate.prototype.exit = true
    super('Error while writing config', { extra: err })
  }
}

export class CopyTemplateFilesError extends ErrorTemplate {
  constructor(err) {
    ErrorTemplate.prototype.source = 'UNEXPECTED'
    ErrorTemplate.prototype.exit = true
    super('Error while copying template files', { extra: err })
  }
}

export class MandatoryParameter extends ErrorTemplate {
  constructor(err) {
    ErrorTemplate.prototype.source = 'UNEXPECTED'
    ErrorTemplate.prototype.exit = true
    super(
      'Request failed due to undefined parameter. Are you sure the API is configured properly?',
      { extra: err },
    )
  }
}

export class UndefinedParameter extends ErrorTemplate {
  constructor(err) {
    ErrorTemplate.prototype.source = 'UNEXPECTED'
    ErrorTemplate.prototype.exit = true
    super('Missing parameter', { extra: err })
  }
}

export class UserUnauthorized extends ErrorTemplate {
  constructor(err) {
    ErrorTemplate.prototype.source = 'EXPECTED'
    ErrorTemplate.prototype.exit = true
    super('User lacks permissions to fetch that information.', {
      extra: err,
    })
  }
}

export class CouldNotCreateOp extends ErrorTemplate {
  constructor(err) {
    ErrorTemplate.prototype.source = 'UNEXPECTED'
    ErrorTemplate.prototype.exit = true
    super('Failed to publish op. API failed to create a new op.', {
      extra: err,
    })
  }
}

export class CouldNotGetRegistryToken extends ErrorTemplate {
  constructor(err) {
    ErrorTemplate.prototype.source = 'UNEXPECTED'
    ErrorTemplate.prototype.exit = true
    super(
      'Call to registry/token failed, most likely due to invalid access token.',
      {
        extra: err,
      },
    )
  }
}
