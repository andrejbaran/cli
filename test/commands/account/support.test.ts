import {expect, test} from '@oclif/test'
import { User } from '../../../src/types/user'
import { clearConfig, writeConfig } from '../../helpers/manage-config'
const faker = require('faker')
const {SEGMENT_URL} = process.env

let accessToken: string
let user: User

describe('account:support', () => {
  beforeEach(async () => {
    accessToken = faker.random.uuid()
    user = {
      username: 'test',
      email: 'test@test.com',
      _id: 'testId'
    }
    await writeConfig({ accessToken, user })
  })
  afterEach(async () => {
    await clearConfig()
  })
  
  test
    .nock(SEGMENT_URL, api => api
      .post(uri => true)
      .reply(200)
    )
    .stdout()
    .command(['account:support'])
    .it('should contain the following texts', async ctx => {
      expect(ctx.stdout).to.contain('❔ Please reach out to us with questions anytime!')
      expect(ctx.stdout).to.contain('⌚️ We are typically available')
      expect(ctx.stdout).to.contain('Monday-Friday 9am-5pm PT')
      expect(ctx.stdout).to.contain('📬 You can always reach us by')
      expect(ctx.stdout).to.contain('email')
      expect(ctx.stdout).to.contain('🖖 We\'ll get back to you as soon as we possibly can')
    })
})
