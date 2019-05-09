/**
 * @author: Prachi Singh (prachi@hackcapital.com)
 * @date: Monday, 6th May 2019 11:11:49 am
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Wednesday, 8th May 2019 4:42:47 pm
 *
 * DESCRIPTION: Base class that the custom errors should be extending from
 * Error template that provides a modular, extensible and customizable errors.
 * Sourced from https://git.cto.ai/hackcapital/tools/errors
 * Modified slightly to fit the application's need
 *
 * @copyright (c) 2019 Hack Capital
 */

import { IExtra } from '../types'
import { errorSource } from '../constants/errorSource'

const { UNEXPECTED } = errorSource
/**
 * ErrorTemplate class provide a base class for customized errors
 *
 * @extends Error
 */
export class ErrorTemplate extends Error {
  original?: Error
  extra: IExtra
  statusCode?: number
  errorCode?: string

  /**
   * @constructor
   *
   * @param {String} [message] Error Message
   * @param {Object} [extra] Append any extra information to the error message
   * @param {Number} [statusCode] Specific for HTTP request, e.g.: 404
   * @param {String} [errorCode] Error codes, e.g.: U0010
   * @param {Error} [original] Original error object
   */
  constructor(
    message: string,
    original?: Error,
    extra: IExtra = { exit: true, source: UNEXPECTED },
    statusCode?: number,
    errorCode?: string,
  ) {
    if (!message) throw new Error('Need to specify a message')

    super(message)

    if (errorCode) this.errorCode = errorCode
    if (statusCode) this.statusCode = statusCode
    if (original) this.original = original
    if (extra.exit === undefined) extra.exit = true
    if (extra.source === undefined) extra.source = UNEXPECTED
    this.extra = {
      exit: extra.exit,
      source: extra.source,
    }

    // name the error
    this.name = this.constructor.name
  }
}
