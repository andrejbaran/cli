/**
 * @author: JP Lew (jp@cto.ai)
 * @date: Tuesday, 11th June 2019 6:30:38 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 12th June 2019 1:26:28 pm
 * @copyright (c) 2019 CTO.ai
 */

import { run } from '../utils/cmd'

jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000 * 60 * 3

test('it should display help commands when no arguments passed', async () => {
  console.log('it should display help commands when no arguments passed')
  const result = await run(['--help'])
  expect(result).toContain('Manage your account settings.')
})

test('it should display help commands when --help flag passed', async () => {
  console.log('it should display help commands when --help flag passed')
  const result = await run()
  expect(result).toContain('Manage your account settings.')
})
