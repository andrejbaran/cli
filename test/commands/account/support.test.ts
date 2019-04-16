import { expect, test } from '@oclif/test'
const { SEGMENT_URL } = process.env
import setupTest from '../../helpers/setupTest'

import { clearConfig } from '../../helpers/manage-config'

describe('account:support', () => {
  beforeEach(async () => {
    await setupTest()
  })
  afterEach(async () => {
    await clearConfig()
  })

  test
    .nock(SEGMENT_URL, api => api.post(uri => true).reply(200))
    .stdout()
    .command(['account:support'])
    .it('should contain the following texts', async ctx => {
      expect(ctx.stdout).to.contain(
        '❔ Please reach out to us with questions anytime!',
      )
      expect(ctx.stdout).to.contain('⌚️ We are typically available')
      expect(ctx.stdout).to.contain('Monday-Friday 9am-5pm PT')
      expect(ctx.stdout).to.contain('📬 You can always reach us by')
      expect(ctx.stdout).to.contain('email')
      expect(ctx.stdout).to.contain(
        "🖖 We'll get back to you as soon as we possibly can",
      )
    })
})
