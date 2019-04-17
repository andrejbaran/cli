/**
 * Author: Brett Campbell (brett@hackcapital.com)
 * Date: Friday, 12th April 2019 10:33:26 am
 * Last Modified By: Brett Campbell (brett@hackcapital.com)
 * Last Modified Time: Friday, 12th April 2019 10:33:26 am
 *
 * DESCRIPTION
 *
 */

import axios from 'axios'

export default async function getLatestVersion(): Promise<string> {
  const { data } = await axios({
    method: 'GET',
    url: '/@cto.ai/ops',
    baseURL: 'https://registry.npmjs.org/',
  })
  const { latest } = data['dist-tags']
  return latest
}