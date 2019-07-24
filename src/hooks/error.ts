/**
 * @author: Prachi Singh (prachi@hackcapital.com)
 * @date: Tuesday, 23rd April 2019 10:55:23 am
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Tuesday, 11th June 2019 4:35:24 pm
 *
 * DESCRIPTION: This hook is used for error handling
 *
 * @copyright (c) 2019 Hack Capital
 */

import { ErrorTemplate } from '../errors/ErrorTemplate'
import { errorSource } from '../constants/errorSource'
import { FeathersClient } from '~/services/Feathers'
import { INTERCOM_EMAIL } from '~/constants/env'

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
    const api = new FeathersClient()
    await api
      .create(
        '/log/event',
        { metadata: options.err },
        {
          headers: {
            Authorization: accessToken,
          },
        },
      )
      .catch(err => {
        this.debug('%O', err)
        this.log(
          `\n 😰 We've encountered a problem. Please try again or contact ${INTERCOM_EMAIL} and we'll do our best to help. \n`,
        )
        process.exit(1)
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
