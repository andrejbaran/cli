import { ux } from '@cto.ai/sdk'
import { expect, test } from '@oclif/test'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as yaml from 'yaml'
import { clearConfig } from '../helpers/manage-config'
import setupTest from '../helpers/setupTest'

import { SEGMENT_URL } from '../../src/constants/env'

const DESIRED_OP_NAME = 'testOpName'
const DESIRED_OP_DESCRIPTION = 'testOpDescription'

const FILES_IN_TEMPLATES: string[] = fs.readdirSync(
  path.resolve(__dirname, '../../src/template'),
)

describe('init', () => {
  beforeEach(async () => {
    await setupTest()
  })
  afterEach(async () => {
    await clearConfig()
    fs.remove(`${process.cwd()}/${DESIRED_OP_NAME}/`)
  })

  test
    .nock(SEGMENT_URL, api => api.post(uri => true).reply(200))
    .stdout()
    .stub(ux, 'prompt', () => ({
      name: DESIRED_OP_NAME,
      description: DESIRED_OP_DESCRIPTION,
    }))
    .stub(ux, 'spinner.start', () => {})
    .stub(ux, 'spinner.stop', () => {})
    .command(['init'])
    .it('copies all templates files on init', ctx => {
      const copiedFiles: string[] = fs.readdirSync(
        path.resolve(`${process.cwd()}/${DESIRED_OP_NAME}`),
      )
      // eql uses deep equality (https://github.com/chaijs/deep-eql)
      expect(FILES_IN_TEMPLATES).to.eql(copiedFiles)
    })

  test
    .nock(SEGMENT_URL, api => api.post(uri => true).reply(200))
    .stdout()
    .stub(ux, 'prompt', () => ({
      name: DESIRED_OP_NAME,
      description: DESIRED_OP_DESCRIPTION,
    }))
    .stub(ux, 'spinner.start', () => {})
    .stub(ux, 'spinner.stop', () => {})
    .command(['init'])
    .it('outputs all template filenames to stdout', ctx => {
      FILES_IN_TEMPLATES.forEach(desiredFileName => {
        expect(ctx.stdout).to.contain(`./${DESIRED_OP_NAME}/${desiredFileName}`)
      })
    })

  test
    .nock(SEGMENT_URL, api => api.post(uri => true).reply(200))
    .stdout()
    .stub(ux, 'prompt', () => ({
      name: DESIRED_OP_NAME,
      description: DESIRED_OP_DESCRIPTION,
    }))
    .stub(ux, 'spinner.start', () => {})
    .stub(ux, 'spinner.stop', () => {})
    .command(['init'])
    .it(
      'should assign name and description on ops.yml according to the user input',
      async () => {
        const manifest = await fs.readFile(
          `${process.cwd()}/${DESIRED_OP_NAME}/ops.yml`,
          'utf8',
        )
        const op = yaml.parse(manifest)
        expect(op.name).to.equal(DESIRED_OP_NAME)
        expect(op.description).to.equal(DESIRED_OP_DESCRIPTION)
      },
    )

  test
    .nock(SEGMENT_URL, api => api.post(uri => true).reply(200))
    .stdout()
    .stub(ux, 'prompt', () => ({
      name: DESIRED_OP_NAME,
      description: DESIRED_OP_DESCRIPTION,
    }))
    .stub(ux, 'spinner.start', () => {})
    .stub(ux, 'spinner.stop', () => {})
    .command(['init'])
    .it(
      'should assign name and description to package.json according to the user input',
      async () => {
        const packageObj = JSON.parse(
          fs.readFileSync(
            `${process.cwd()}/${DESIRED_OP_NAME}/package.json`,
            'utf8',
          ),
        )

        expect(packageObj.name).to.equal(DESIRED_OP_NAME)
        expect(packageObj.description).to.equal(DESIRED_OP_DESCRIPTION)
      },
    )
})
