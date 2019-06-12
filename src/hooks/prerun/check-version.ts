import { Hook } from '@oclif/config'
import { ux } from '@cto.ai/sdk'

import getLatestVersion from '../../utils/get-latest-version'

import { DEBUG } from '~/constants/env'

const hook: Hook<'prerun'> = async function(opts) {
  if (DEBUG) {
    return
  }

  try {
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
  } catch (err) {
    this.debug('%O', err)
    await this.config.runHook('error', { err })
  }
}

export default hook
