/**
 * @author: Prachi Singh (prachi@hackcapital.com)
 * @date: Tuesday, 23rd April 2019 10:55:23 am
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Monday, 26th August 2019 4:19:13 pm
 *
 * DESCRIPTION: This hook is used for error handling
 *
 * @copyright (c) 2019 Hack Capital
 */

import { ErrorTemplate } from '../errors/ErrorTemplate'
import { errorSource } from '../constants/errorSource'
import { INTERCOM_EMAIL, OPS_API_HOST } from '~/constants/env'
import axios from 'axios'

const { UNEXPECTED } = errorSource

/**
 * Error hook to handle the errors
 *
 * @export
 * @param {*} this
 * @param {{ err: Error }} options
 */
export default async function error(
  this: any,
  options: { err: ErrorTemplate; accessToken?: string },
) {
  const { accessToken } = options
  if (accessToken) {
    await axios
      .post(
        `${OPS_API_HOST}analytics-service/private/events`,
        { metadata: options.err },
        {
          headers: {
            Authorization: accessToken,
          },
        },
      )
      .catch(err => {
        this.debug('%O', err)
      })
  }

  const { extra, message } = options.err

  if (extra && extra.source === UNEXPECTED) {
    this.log(
      `\n 😰 We've encountered a problem. Please try again or contact ${INTERCOM_EMAIL} and we'll do our best to help. \n`,
    )
    process.exit(1)
  }

  this.log(`\n ${message}`)

  if (extra && extra.exit) process.exit()
}
