import { expect, test } from '@oclif/test'

const { ux } = require('@cto.ai/sdk')
const { SEGMENT_URL = '' } = process.env

import AccountSignup from '../../../src/commands/account/signup'
import { baseTest } from '../../helpers/base-test'
import { clearConfig, readConfig } from '../../helpers/manage-config'

// TO-DO: restore tests
describe.skip('account:signup', () => {
  const email = 'test@test.com'
  const username = 'test'
  const answer = { email: 'test@test.com', password: 'password' }

  // AccountSignup extends from oclif Command class which expects arguments in certain shape (see Iconfig in @oclif/config)
  // thus created a configFake to bypass typescript type checking for required args for AccountSignup class
  const configFake: any = {}
  const signup = new AccountSignup([], configFake)

  afterEach(async () => {
    await clearConfig()
  })
  baseTest
    .nock(SEGMENT_URL, api => api.post(uri => true).reply(200))
    .nock(`${process.env.OPS_API_HOST}${process.env.OPS_API_PATH}`, api =>
      api.post('/users').reply(200),
    )
    .nock(`${process.env.OPS_API_HOST}${process.env.OPS_API_PATH}`, api =>
      api.post('/auth').reply(200, {
        user: { username, email },
      }),
    )
    .stdout()
    .stub(ux, 'url', () => 'email')
    .stub(ux, 'prompt', () => answer)
    .stub(ux, 'spinner.start', () => {})
    .stub(ux, 'spinner.stop', () => {})
    .command(['account:signup'])
    .it('runs signup', async ctx => {
      const config = await readConfig()
      expect(ctx.stdout).to.contain(
        '💻 CTO.ai Ops - The CLI built for Teams 🚀',
      )
      expect(ctx.stdout).to.contain('👋 Welcome to the Ops CLI beta!')
      expect(ctx.stdout).to.contain('❔ Let us know if you have questions...')
      expect(ctx.stdout).to.contain('📬 You can always reach us by email')
      expect(ctx.stdout).to.contain("⚡️ Let's get you started...")
      expect(ctx.stdout).to.contain(
        '✅ Your account is setup! You can now build, run and share ops!',
      )
      expect(ctx.stdout).to.contain(
        '🎉 We just sent you an email with tips on how to get started!',
      )
      expect(config.user.username).to.equal(username)
      expect(config.user.email).to.equal(email)
    })
  test.it('validates email to not allow invalid formats', async _ctx => {
    const response1 = await signup._validateEmail('testtest.com')
    const response2 = await signup._validateEmail('test@test')
    expect(response1).to.equal('Invalid email format')
    expect(response2).to.equal('Invalid email format')
  })

  test
    .nock(`${process.env.OPS_API_HOST}${process.env.OPS_API_PATH}`, api =>
      api
        .get('/validate/users/unique')
        .query({ email })
        .reply(200, {
          unique: false,
        }),
    )
    .it('validates email to not allow duplicate emails', async _ctx => {
      const response = await signup._validateEmail(email)
      expect(response).to.equal('Email is taken, please use another.')
    })

  test
    .nock(`${process.env.OPS_API_HOST}${process.env.OPS_API_PATH}`, api =>
      api
        .get('/validate/users/unique')
        .query({ username })
        .reply(200, {
          unique: false,
        }),
    )
    .it('validates username to not allow duplicate usernames', async _ctx => {
      const response = await signup._validateUsername(username)
      expect(response).to.equal('Username is taken, please use another.')
    })

  test.it('confirms password', async _ctx => {
    const response = await signup._validateCpassword('password', answer)
    const response1 = await signup._validateCpassword('password1', answer)
    expect(response).to.equal(true)
    expect(response1).to.equal("Password doesn't match, please try again.")
  })
})
