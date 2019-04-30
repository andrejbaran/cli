/**
 * @author: Prachi Singh (prachi@hackcapital.com)
 * @date: Tuesday, 30th April 2019 2:32:54 pm
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Tuesday, 30th April 2019 3:39:38 pm
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
