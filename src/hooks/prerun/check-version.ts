import { Hook } from '@oclif/config'
import { ux } from '@cto.ai/sdk'

import { readConfig, writeConfig, getLatestVersion } from '~/utils'

const hook: Hook<'prerun'> = async function(opts) {
  try {
    if (opts.Command.id === 'update') return
    const config = await readConfig(this.config.configDir)
    const today = new Date()
    if (
      config.lastUpdateCheckAt &&
      today.getTime() - new Date(config.lastUpdateCheckAt).getTime() <
        24 * 60 * 60 * 1000
    ) {
      return
    }
    await writeConfig(
      config,
      { lastUpdateCheckAt: today },
      this.config.configDir,
    )
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
