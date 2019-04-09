import {expect, test} from '@oclif/test'
const {ux} = require('@cto.ai/sdk')

import {clearConfig, readConfig} from '../../helpers/manage-config'

const answer = {email: 'test@test.com', password: 'password'}
describe('account:signup', () => {
  const email = 'test@test.com'
  const username = 'test'

  afterEach(async () => clearConfig())
  test
    .nock(`${process.env.CTOAI_API_URL}`, api => api
      .post('/users')
      .reply(200)
    )
    .nock(`${process.env.CTOAI_API_URL}`, api => api
      .post('/auth')
      .reply(200, {
        user: {username, email}
      })
    )
    .stdout()
    .stub(ux, 'prompt', () => answer)
    .stub(ux, 'spinner.start', () => { })
    .stub(ux, 'spinner.stop', () => { })
    .command(['account:signup'])
    .it('runs signup', async ctx => {
      const config = await readConfig()
      expect(ctx.stdout).to.contain('Your account is setup! You can now build, run and share ops!')
      expect(config.user.username).to.equal(username)
      expect(config.user.email).to.equal(email)
    })
})
