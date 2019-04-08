import {expect, test} from '@oclif/test'

const {ux} = require('@cto.ai/sdk')
const faker = require('faker')

import {clearConfig, writeConfig} from '../helpers/manage-config'

let accessToken: string
let teamId: string
describe('list', () => {
  beforeEach(async () => {
    accessToken = faker.random.uuid()
    teamId = faker.random.uuid()
    await writeConfig({accessToken, teamId})
  })
  afterEach(async () => {
    await clearConfig()
  })

  test
    .nock(`${process.env.CTOAI_API_URL}`, api => api
      .get('/ops')
      .query({
        owner_id: teamId
      })
      .reply(200, {data: []})
    )
    .stdout()
    .stub(ux, 'prompt', () => {
      return {runOp: 'runOp'}
    })
    .command(['list'])
    .it('runs list', ctx => {
      expect(ctx.stdout).to.contain("Here's a list of ops available for")
    })
})
