import { expect, test } from '@oclif/test'
import { ux } from '@cto.ai/sdk'
import { clearConfig, writeConfig } from '../../helpers/manage-config'
import setupTest from '../../helpers/setupTest'

import { SEGMENT_URL } from '../../../src/constants/env'

describe('account:signout', () => {
  afterEach(async () => clearConfig())

  test
    .stdout()
    .command(['account:signout'])
    .it('should contain the following texts', async ctx => {
      expect(ctx.stdout).to.contain('You are already signed out.')
    })

  test
    .nock(SEGMENT_URL, api => api.post(uri => true).reply(200))
    .do(async () => setupTest())
    .stdout()
    .stub(ux, 'spinner.start', () => {})
    .stub(ux, 'spinner.stop', () => {})
    .command(['account:signout'])
    .it('should contain the following texts', async ctx => {
      expect(ctx.stdout).to.contain('✓ Signed out!')
    })
})
