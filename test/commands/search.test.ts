import { ux } from '@cto.ai/sdk'
import { expect, test } from '@oclif/test'
import setupTest from '../helpers/setupTest'
import { SEGMENT_URL } from '../../src/constants/env'
import { clearConfig } from '../helpers/manage-config'

// TO-DO: restore tests
describe.skip('search', () => {
  beforeEach(async () => {
    await setupTest()
  })
  afterEach(async () => {
    await clearConfig()
  })

  test
    .nock(SEGMENT_URL, api => api.post(uri => true).reply(200))
    .nock(`${process.env.OPS_API_HOST}${process.env.OPS_API_PATH}`, api =>
      api
        .get('/ops')
        .query({ $limit: 100 })
        .reply(200, { data: [] }),
    )
    .stdout()
    .stub(ux, 'prompt', () => {
      return {
        runOp: {
          name: 'runOp',
          _id: 'opTestId',
        },
      }
    })
    .command(['search'])
    .it('runs search command', ctx => {
      expect(ctx.stdout).to.contain(
        '\n🔍 Searching the repository for all ops...\n\n💻 Run $ ops run runOp:optestid to test your op. \n\n',
      )
    })
})
