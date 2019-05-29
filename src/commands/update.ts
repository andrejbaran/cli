import { ux } from '@cto.ai/sdk'
const util = require('util')
const exec = util.promisify(require('child_process').exec)

import Command, { flags } from '../base'
import getLatestVersion from '../utils/get-latest-version'
import { PermissionsError } from '../errors/customErrors'

let self

export default class Update extends Command {
  static description = 'Update the ops CLI.'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  async run() {
    try {
      self = this
      const latestVersion = await getLatestVersion()
      await this._logUpdateMessage(latestVersion)
      await this._askQuestion()
      await this._updateVersion()
      this._trackAnalytics(latestVersion)
    } catch (err) {
      this.debug(err)
      this.config.runHook('error', { err })
    }
  }

  private _logUpdateMessage(latestVersion: string | undefined) {
    self.log(
      `${ux.colors.white(
        `\n📦 ${ux.colors.actionBlue(
          'INSTALL UPDATE?',
        )} - You're about to update to ${ux.colors.callOutCyan(
          `CTO.ai Ops CLI ${latestVersion}`,
        )} ${ux.colors.reset.green('→')}`,
      )}`,
    )
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
    try {
      ux.spinner.start('Updating version')
      await exec('npm install -g @cto.ai/ops')
      ux.spinner.stop('Done!')
    } catch (err) {
      this.debug(err)
      ux.spinner.stop('Failed')
      throw new PermissionsError(err)
    }
  }
}
