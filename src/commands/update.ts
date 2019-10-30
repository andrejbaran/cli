import { ux } from '@cto.ai/sdk'
const util = require('util')
const exec = util.promisify(require('child_process').exec)

import Command, { flags } from '../base'
import getLatestVersion from '../utils/get-latest-version'
import { PermissionsError } from '../errors/CustomErrors'

export default class Update extends Command {
  static description = 'Update the ops CLI.'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  async run() {
    this.parse(Update)
    try {
      const latestVersion = await getLatestVersion()

      await this.logUpdateMessage(latestVersion)
      await this.askQuestion()
      await this.updateVersion()
      await this.trackAnalytics(latestVersion)
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }

  async logUpdateMessage(latestVersion: string | undefined) {
    this.log(
      `${ux.colors.white(
        `\n📦 ${ux.colors.actionBlue(
          'INSTALL UPDATE?',
        )} - You're about to update to ${ux.colors.callOutCyan(
          `CTO.ai Ops CLI ${latestVersion}`,
        )} ${ux.colors.reset.green('→')}`,
      )}`,
    )
  }

  async trackAnalytics(newVersion: string | undefined) {
    if (this.user) {
      await this.services.analytics.track(
        {
          userId: this.user.email,
          teamId: this.team.id,
          event: 'Ops CLI Update',
          properties: {
            oldVersion: this.config.version,
            newVersion,
          },
        },
        this.accessToken,
      )
    }
  }

  async askQuestion() {
    const { install } = await ux.prompt<{ install: boolean }>({
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

  async updateVersion() {
    try {
      ux.spinner.start('Updating version')
      await exec('npm install -g @cto.ai/ops')
      ux.spinner.stop('Done!')
    } catch (err) {
      this.debug('%O', err)
      ux.spinner.stop('Failed')
      throw new PermissionsError(err)
    }
  }
}
