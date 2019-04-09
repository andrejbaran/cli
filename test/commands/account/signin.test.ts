import {expect, test} from '@oclif/test'
const {ux} = require('@cto.ai/sdk')

import {clearConfig, readConfig} from '../../helpers/manage-config'

describe('account:signin', () => {
  const email = 'test@test.com'
  const password = 'password'
  const username = 'test'
  afterEach(async () => clearConfig())
  test
    .nock(`${process.env.CTOAI_API_URL}`, api => api
      .post('/auth')
      .reply(200, {
        user: {username, email}
      })
    )
    .stdout()
    .stub(ux, 'spinner.start', () => { })
    .stub(ux, 'spinner.stop', () => { })
    .command(['account:signin', `-e ${email}`, `-p ${password}`])
    .it('should go straight to signin', async ctx => {
      const config = await readConfig()
      expect(ctx.stdout).to.not.contain('Please login to get started.')
      expect(ctx.stdout).to.contain(`👋 Welcome back ${username}!`)
      expect(config.user.username).to.equal(username)
      expect(config.user.email).to.equal(email)
    })

  test
    .nock(`${process.env.CTOAI_API_URL}`, api => api
      .post('/auth')
      .reply(200, {
        user: {username, email}
      })
    )
    .stdout()
    .stub(ux, 'spinner.start', () => { })
    .stub(ux, 'spinner.stop', () => { })
    .stub(ux, 'prompt', () => {
      return {email, password: 'password'}
    })
    .command(['account:signin'])
    .it('should prompt for email and password', async ctx => {
      const config = await readConfig()
      expect(ctx.stdout).to.contain('Please login to get started.')
      expect(config.user.username).to.equal(username)
      expect(config.user.email).to.equal(email)
    })
})
