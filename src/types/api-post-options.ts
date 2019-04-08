/**
 * Author: Brett Campbell (brett@hackcapital.com)
 * Date: Thursday, 4th April 2019 10:04:54 am
 * Last Modified By: Brett Campbell (brett@hackcapital.com)
 * Last Modified Time: Thursday, 4th April 2019 10:05:21 am
 *
 * DESCRIPTION
 *
 */

export interface ApiPostOptions {
  url: string,
  data: object,
  params?: object,
  headers?: {
    authorization?: string
  }
}

export default ApiPostOptions
