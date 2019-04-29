const { ux } = require('@cto.ai/sdk')
import { expect, test } from '@oclif/test'

import { baseTest } from '../../helpers/base-test'
import { clearConfig, readConfig } from '../../helpers/manage-config'
import { apiUrl } from '../../../src/base'

const { SEGMENT_URL = '' } = process.env

// TO-DO: restore tests
describe.skip('account:signin', () => {
  const email = 'test@test.com'
  const password = 'password'
  const username = 'test'

  afterEach(async () => {
    await clearConfig()
  })

  if (!SEGMENT_URL) {
    return null
  }

  baseTest
    .nock(SEGMENT_URL, api => api.post(() => true).reply(200))
    .nock(apiUrl, api =>
      api.post('/login').reply(200, {
        user: { username, email },
      }),
    )
    .stdout()
    .stub(ux, 'spinner.start', () => {})
    .stub(ux, 'spinner.stop', () => {})
    .command(['account:signin', `-e ${email}`, `-p ${password}`])
    .it('should go straight to signin', async ctx => {
      const config = await readConfig()
      expect(ctx.stdout).to.not.contain('Please login to get started.')
      expect(ctx.stdout).to.contain(`👋 Welcome back ${username}!`)
      expect(config.user.username).to.equal(username)
      expect(config.user.email).to.equal(email)
    })

  baseTest
    .nock(SEGMENT_URL, api => api.post(uri => true).reply(200))
    .nock(apiUrl, api =>
      api.post('/auth').reply(200, {
        user: { username, email },
      }),
    )
    .stdout()
    .stub(ux, 'spinner.start', () => {})
    .stub(ux, 'spinner.stop', () => {})
    .stub(ux, 'prompt', () => {
      return { email, password: 'password' }
    })
    .command(['account:signin'])
    .it('should prompt for email and password', async ctx => {
      const config = await readConfig()
      expect(ctx.stdout).to.contain('Please login to get started.')
      expect(config.user.username).to.equal(username)
      expect(config.user.email).to.equal(email)
    })
})
