import {expect, test} from '@oclif/test'
const {ux} = require('@cto.ai/sdk')
const faker = require('faker')

import {clearConfig, readConfig} from '../../helpers/manage-config'

let accessToken: string

const answer =  {email: 'test@test.com', password: 'password'}
describe('account:signup', () => {
  beforeEach(async () => accessToken = faker.random.uuid())
  afterEach(async () => clearConfig())
  test
    .nock(`${process.env.CTOAI_API_URL}`, api => api
      .post('/accounts')
      .reply(200)
    )
    .nock(`${process.env.CTOAI_API_URL}`, api => api
      .post('/login')
      .reply(200, {data: accessToken})
    )
    .stdout()
    .stub(ux, 'prompt', () => answer)
    .stub(ux, 'spinner.start', () => { })
    .stub(ux, 'spinner.stop', () => { })
    .command(['account:signup'])
    .it('runs signin', async ctx => {
      const config = await readConfig()
      expect(ctx.stdout).to.contain("👋 Welcome to the Ops CLI beta - we're excited to see the Workflows you'll create for your team.")
      expect(config.accessToken).to.equal(accessToken)
    })

})
