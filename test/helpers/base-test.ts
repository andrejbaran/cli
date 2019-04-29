/**
 * Author: Brett Campbell (brett@hackcapital.com)
 * Date: Monday, 15th April 2019 1:34:28 pm
 * Last Modified By: Brett Campbell (brett@hackcapital.com)
 * Last Modified Time: Monday, 15th April 2019 1:34:28 pm
 *
 * DESCRIPTION
 *
 */
import { test } from '@oclif/test'

export const latest = '0.0.0'

export const baseTest = test.nock('https://registry.npmjs.org', api =>
  api.get('/@cto.ai/ops').reply(200, { 'dist-tags': { latest } }),
)
