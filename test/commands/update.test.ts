import {expect} from '@oclif/test'

import {baseTest, latest} from '../helpers/base-test'
import {clearConfig, writeConfig} from '../helpers/manage-config'

const {ux} = require('@cto.ai/sdk')

describe('update', () => {
  baseTest
    .stdout()
    .stub(ux, 'prompt', () => {
      return {install: false}
    })
    .command(['update'])
    .it('runs update', ctx => {
      expect(ctx.stdout).to.contain(`📦 INSTALL UPDATE? - You're about to update to CTO.ai Ops CLI ${latest}`)
      expect(ctx.stdout).to.contain("❌ Update cancelled - Let us know when you're ready for some sweet, sweet, updates.")
    })
})
