import { expect, test } from '@oclif/test'

const { ux } = require('@cto.ai/sdk')
const faker = require('faker')

import {
  clearConfig,
  writeConfig,
  readConfig,
} from '../../helpers/manage-config'
import { baseTest } from '../../helpers/base-test'
import Team from '../../../src/types/Team'
import User from '../../../src/types/User'
import { teamFactory, userFactory, accessTokenFactory } from '../../factories'

let team: Team
let user: User
let accessToken: string

describe('team:switch', () => {
  beforeEach(async () => {
    team = teamFactory()
    user = userFactory()
    accessToken = faker.random.uuid()

    await writeConfig({
      team,
      user,
      accessToken,
    })
  })
  afterEach(async () => {
    await clearConfig()
  })

  // Testing the list of teams
  baseTest
    .nock(`${process.env.OPS_API_HOST}${process.env.OPS_API_PATH}`, api =>
      api.get('/teams').reply(200, { data: [team] }),
    )
    .stdout()
    .stub(ux, 'prompt', () => ({ teamSelected: team.name }))
    .command(['team:switch'])
    .it('shows the list of teams', ctx => {
      expect(ctx.stdout).to.contain(`Here's the list of your teams:\n`)
    })

  const team1 = teamFactory()
  const team2 = teamFactory()

  baseTest
    .nock(`${process.env.OPS_API_HOST}${process.env.OPS_API_PATH}`, api =>
      api.get('/teams').reply(200, { data: [team, team1, team2] }),
    )
    .stdout()
    .stub(ux, 'prompt', () => ({ teamSelected: team1.name }))
    .command(['team:switch'])
    .it('switches the active team to a different team', async ctx => {
      expect((await readConfig()).team.name).to.equal(team1.name)
    })

  baseTest
    .nock(`${process.env.OPS_API_HOST}${process.env.OPS_API_PATH}`, api =>
      api.get('/teams').reply(200, { data: [team, team1, team2] }),
    )
    .stdout()
    .stub(ux, 'prompt', () => ({ teamSelected: team.name }))
    .command(['team:switch'])
    .it('switches the active team to the same team', async ctx => {
      expect((await readConfig()).team.name).to.equal(team.name)
    })
})
