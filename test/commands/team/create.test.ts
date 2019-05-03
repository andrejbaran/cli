import { expect, test } from '@oclif/test'

const { ux } = require('@cto.ai/sdk')
import TeamCreate from '../../../src/commands/team/create'
import {
  clearConfig,
  readConfig,
  writeConfig,
} from '../../helpers/manage-config'
import { baseTest } from '../../helpers/base-test'
import { Team, User } from '../../../src/types'
import { teamFactory, accessTokenFactory, userFactory } from '../../factories'

// TeamCreate extends from oclif Command class which expects arguments in certain shape (see Iconfig in @oclif/config)
// thus created a configFake to bypass typescript type checking for required args for TeamCreate class
const configFake: any = {}
const teamCreate = new TeamCreate([], configFake)
import { SEGMENT_URL } from '../../../src/constants/env'

let accessToken: string
let team: Team
let user: User
describe('team:create', () => {
  accessToken = accessTokenFactory()
  team = teamFactory()
  user = userFactory()

  beforeEach(async () => {
    await writeConfig({ accessToken, team, user })
  })
  afterEach(async () => clearConfig())

  baseTest
    .nock(SEGMENT_URL, api => api.post(uri => true).reply(200))
    .nock(
      `${process.env.OPS_API_HOST}${process.env.OPS_API_PATH}`,
      {
        reqheaders: {
          authorization: accessToken,
        },
      },
      api =>
        api
          .post('/teams', { name: `${team.name}` })
          .reply(200, { data: { ...team } }),
    )
    .stdout()
    .command(['team:create', `-n${team.name}`])
    .it('should create the team with name flag', async ctx => {
      const config = await readConfig()
      expect(ctx.stdout).to.contain('🙌 Your team has been created!')
      expect(config.team.name).to.equal(team.name)
    })

  baseTest
    .nock(SEGMENT_URL, api => api.post(uri => true).reply(200))
    .nock(
      `${process.env.OPS_API_HOST}${process.env.OPS_API_PATH}`,
      {
        reqheaders: {
          authorization: accessToken,
        },
      },
      api =>
        api
          .post('/teams', { name: team.name })
          .reply(200, { data: { ...team } }),
    )
    .stdout()
    .stub(ux, 'prompt', () => {
      return { teamName: team.name }
    })
    .command(['team:create'])
    .it('should create team with user prompt', async ctx => {
      const config = await readConfig()
      expect(ctx.stdout).to.contain('🙌 Your team has been created!')
      expect(config.team.name).to.equal(team.name)
    })

  // test
  //   .nock(`${process.env.OPS_API_HOST}${process.env.OPS_API_PATH}`, api =>
  //     api
  //       .get('/validate/teams/unique')
  //       .query({ teamName })
  //       .reply(200, {
  //         unique: false,
  //       }),
  //   )
  //   .it('should not create team if teamname is not unique ', async _ctx => {
  //     const response = await teamCreate.validateTeamName(teamName)
  //     expect(response).to.equal('Name already taken')
  //   })
  // test
  //   .nock(`${process.env.OPS_API_HOST}${process.env.OPS_API_PATH}`, api =>
  //     api
  //       .get('/validate/teams/unique')
  //       .query({ teamName })
  //       .reply(200, {
  //         unique: true,
  //       }),
  //   )
  //   .it('should create team if the name is unique ', async _ctx => {
  //     const response = await teamCreate.validateTeamName(teamName)
  //     expect(response).to.equal(true)
  //   })
})
