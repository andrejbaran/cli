/**
 * @author: Prachi Singh (prachi@hackcapital.com)
 * @date: Monday, 6th May 2019 11:11:49 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Tuesday, 11th June 2019 1:52:14 pm
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
  extra: IExtra

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
    public message: string,
    public original?: Error | ErrorResponse,
    extra: IExtra = { exit: true, source: UNEXPECTED },
    public statusCode?: number,
    public errorCode?: string,
  ) {
    super(message)

    if (!message) throw new Error('Need to specify a message')

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

//this originates from the Go API
export interface ErrorResponse {
  data: null
  error: GoError
}

export interface GoError {
  requestID: string
  code: number
  message: string
}
