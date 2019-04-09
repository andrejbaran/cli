import {expect, test} from '@oclif/test'

const {ux} = require('@cto.ai/sdk')
const faker = require('faker')

import {User} from '../../src/types/user'
import {clearConfig, writeConfig} from '../helpers/manage-config'

let accessToken: string
let user: User
describe('search', () => {
  beforeEach(async () => {
    accessToken = faker.random.uuid()
    user = {
      username: 'test',
      email: 'test@test.com',
      _id: 'testId'
    }
    await writeConfig({accessToken, user})
  })
  afterEach(async () => {
    await clearConfig()
  })

  test
    .nock(`${process.env.CTOAI_API_URL}`, api => api
      .get('/ops')
      .query({$limit: 100})
      .reply(200, {data: []})
    )
    .stdout()
    .stub(ux, 'prompt', () => {
      return {runOp: {
        name: 'runOp',
        _id: 'opTestId'
      }}
    })
    .command(['search'])
    .it('runs search command', ctx => {
      expect(ctx.stdout).to.contain('\n🔍 Searching the repository for all ops...\n\n💻 Run $ ops run runOp:optestid to test your op. \n\n')
    })
})
