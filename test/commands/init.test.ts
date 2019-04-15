import {expect, test} from '@oclif/test'
import {User} from '../../src/types/user'
import {clearConfig, writeConfig} from '../helpers/manage-config'
import {userFactory, accessTokenFactory} from '../factories/'
const {SEGMENT_URL} = process.env
const {ux} = require('@cto.ai/sdk')
const fs = require('fs-extra')
const yaml = require('yaml')

let accessToken: string
let user: User

const DESIRED_OP_NAME = 'testOpName'
const DESIRED_OP_DESCRIPTION = 'testOpDescription'
const FILES_IN_TEMPLATES: Array<string> = [
  '.dockerignore',
  '.gitignore',
  'Dockerfile',
  'README.md',
  'demo.js',
  'index.js',
  'ops.yml',
  'package.json'
]

describe('init', () => {
  beforeEach(async () => {
    accessToken = accessTokenFactory()
    user = userFactory()
    await writeConfig({accessToken, user})
  })
  afterEach(async () => {
    await clearConfig()
    fs.remove(`${process.cwd()}/${DESIRED_OP_NAME}/`)
  })

  test
    .nock(SEGMENT_URL, api => api
      .post(uri => true)
      .reply(200)
    )
    .stdout()
    .stub(ux, 'prompt', () => ({name: DESIRED_OP_NAME, description: DESIRED_OP_DESCRIPTION}))
    .stub(ux, 'spinner.start', () => { })
    .stub(ux, 'spinner.stop', () => { })
    .command(['init'])
    .it('is able to create templates on init', ctx => {
      FILES_IN_TEMPLATES.forEach(desiredFileName => {
        expect(ctx.stdout).to.contain(`./${DESIRED_OP_NAME}/${desiredFileName}`)
      })
    })

  test
    .nock(SEGMENT_URL, api => api
      .post(uri => true)
      .reply(200)
    )
    .stdout()
    .stub(ux, 'prompt', () => ({name: DESIRED_OP_NAME, description: DESIRED_OP_DESCRIPTION}))
    .stub(ux, 'spinner.start', () => { })
    .stub(ux, 'spinner.stop', () => { })
    .command(['init'])
    .it('should assign name and description on ops.yml according to the user input', async () => {
      const manifest = await fs.readFile(`${process.cwd()}/${DESIRED_OP_NAME}/ops.yml`, 'utf8')
      const op = yaml.parse(manifest)
      expect(op.name).to.equal(DESIRED_OP_NAME)
      expect(op.description).to.equal(DESIRED_OP_DESCRIPTION)
    })
})
