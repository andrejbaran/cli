import Command, { flags } from '../base'
import getLatestVersion from '../utils/get-latest-version'

const { ux } = require('@cto.ai/sdk')
const util = require('util')
const exec = util.promisify(require('child_process').exec)

export default class Update extends Command {
  static description = 'Update the ops CLI'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  async run() {
    const self = this
    const latest = await getLatestVersion()
    self.log(
      `${ux.colors.white(
        `\n📦 ${ux.colors.actionBlue(
          'INSTALL UPDATE?',
        )} - You're about to update to ${ux.colors.callOutCyan(
          `CTO.ai Ops CLI ${latest}`,
        )} ${ux.colors.reset.green('→')}`,
      )}`,
    )
    await this._askQuestion()
    await this._updateVersion()
    this._trackAnalytics(latest)
  }

  private _trackAnalytics(newVersion) {
    this.analytics.track({
      userId: this.user.email,
      event: 'Ops CLI Update',
      properties: {
        oldVersion: this.config.version,
        newVersion,
      },
    })
  }

  private async _askQuestion() {
    const { install } = await ux.prompt({
      type: 'confirm',
      name: 'install',
      message: `\n${ux.colors.white('Install update?')}`,
    })
    this.log('')
    if (!install) {
      this.log(
        `${ux.colors.errorRed('❌ Update cancelled')} ${ux.colors.white(
          "- Let us know when you're ready for some sweet, sweet, updates.",
        )}`,
      )
      process.exit()
    }
  }

  private async _updateVersion() {
    ux.spinner.start('Updating version')
    await exec('npm install -g @cto.ai/ops').catch(() => {
      ux.spinner.stop('Failed')
      this.log(
        `${ux.colors.white(
          'Could not install. Please check your permissions',
        )}`,
      )
      process.exit()
    })
    ux.spinner.stop('Done!')
  }
}
