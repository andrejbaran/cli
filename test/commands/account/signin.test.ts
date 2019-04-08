import {expect, test} from '@oclif/test'

const faker = require('faker')
const {ux} = require('@cto.ai/sdk')

import {clearConfig, readConfig} from '../../helpers/manage-config'

let accessToken: string

describe('account:signin', () => {
  beforeEach(async () => accessToken = faker.random.uuid())
  afterEach(async () => clearConfig())
  test
    .nock(`${process.env.CTOAI_API_URL}`, api => api
      .post('/login')
      .reply(200, {data: accessToken})
    )
    .stdout()
    .command(['account:signin', '-u Test', '-p password'])
    .it('should go straight to signin', async ctx => {
      const config = await readConfig()
      expect(ctx.stdout).to.not.contain('Please login to get started.')
      expect(ctx.stdout).to.contain('👋 Welcome back! Type ops list to see a list of ops or ops run to get started')
      expect(config.accessToken).to.equal(accessToken)
    })

  test
    .nock(`${process.env.CTOAI_API_URL}`, api => api
      .post('/login')
      .reply(200, {data: accessToken})
    )
    .stdout()
    .stub(ux, 'prompt', () => {
      return {username: 'test', password: 'password'}
    })
    .command(['account:signin'])
    .it('should prompt for missing inputs', async ctx => {
      const config = await readConfig()
      expect(ctx.stdout).to.contain('Please login to get started.')
      expect(ctx.stdout).to.contain('👋 Welcome back! Type ops list to see a list of ops or ops run to get started')
      expect(config.accessToken).to.equal(accessToken)
    })
})
