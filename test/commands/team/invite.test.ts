import { expect, test } from '@oclif/test'
const { ux } = require('@cto.ai/sdk')

import { clearConfig } from '../../helpers/manage-config'

describe('team:invite', () => {
  afterEach(async () => clearConfig())
  test
    .stdout()
    .command(['team:invite', '-e test@email.com'])
    .it(
      'should invite the team member directly without prompting for user action',
      ctx => {
        expect(ctx.stdout).to.contain('\n ✓ Invite sent!     test@email.com\n')
      },
    )

  test
    .stdout()
    .stub(ux, 'prompt', () => {
      return { inviteeEmail: 'test@email.com' }
    })
    .command(['team:invite'])
    .it('should prompt for missing input', ctx => {
      expect(ctx.stdout).to.contain('\n ✓ Invite sent!    test@email.com\n')
    })
})
