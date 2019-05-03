/**
 * @author: Prachi Singh (prachi@hackcapital.com)
 * @date: Tuesday, 23rd April 2019 10:55:23 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 1st May 2019 5:28:25 pm
 *
 * DESCRIPTION: This hook is used for error handling
 *
 * @copyright (c) 2019 Hack Capital
 */

import { log } from '@cto.ai/sdk'
import { Error } from '../types'

/**
 * Error hook to handle the errors
 *
 * @export
 * @param {*} this
 * @param {{ err: Error }} options
 */
export default async function error(this: any, options: { err: Error }) {
  log.error(options.err.stack)

  if (options.err.source === 'UNEXPECTED') {
    this.log(
      `\n 😰 We've encountered a problem. Please try again or contact support@cto.ai and we'll do our best to help. \n`,
    )
  } else if (options.err.source === 'EXPECTED') {
    this.log(`\n ${options.err.message}`)
  }

  if (options.err.exit) {
    process.exit()
  }
}
