import { Hook } from '@oclif/config'

import getLatestVersion from '../../utils/get-latest-version'

const { ux } = require('@cto.ai/sdk')

const hook: Hook<'prerun'> = async function(opts) {
  if (opts.Command.id === 'update') return
  const latest = await getLatestVersion()
  if (latest !== this.config.version) {
    this.log(
      ux.colors.white(
        `⚠️  ${ux.colors.actionBlue(
          'UPDATE AVAILABLE',
        )} - The latest version of ${ux.colors.callOutCyan(
          `CTO.ai Ops CLI is ${latest}`,
        )}.\nTo update to the latest version please run '${ux.colors.callOutCyan(
          'ops update',
        )}'\n`,
      ),
    )
  }
}

export default hook
