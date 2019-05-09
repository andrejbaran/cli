/**
 * @author: Prachi Singh (prachi@hackcapital.com)
 * @date: Tuesday, 23rd April 2019 10:55:23 am
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Monday, 6th May 2019 2:23:42 pm
 *
 * DESCRIPTION: This hook is used for error handling
 *
 * @copyright (c) 2019 Hack Capital
 */

import { log } from '@cto.ai/sdk'
import { ErrorTemplate } from '../errors/base'
import { errorSource } from '../constants/errorSource'

/**
 * Error hook to handle the errors
 *
 * @export
 * @param {*} this
 * @param {{ err: Error }} options
 */
export default async function error(
  this: any,
  options: { err: ErrorTemplate },
) {
  log.error(options.err)

  const { UNEXPECTED } = errorSource
  const { extra } = options.err
  const { message } = options.err

  if (extra && extra.source === UNEXPECTED) {
    this.log(
      `\n 😰 We've encountered a problem. Please try again or contact support@cto.ai and we'll do our best to help. \n`,
    )
    process.exit(1)
  }

  this.log(`\n ${message}`)

  if (extra && extra.exit) process.exit()
}
