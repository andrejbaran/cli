import Command, { flags } from '../base'
import { Config } from '../types'
import { DEBUG } from '../constants/env'

export default class Whoami extends Command {
  static description = 'Display your user information'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  async run() {
    const config: Config = await this.readConfig()

    if (!this.user) {
      this.log('')
      this.log(`✋ You don't appear to be logged in.`)
      this.log(
        `🎳 You can sign up with ${this.ux.colors.green(
          '$',
        )} ${this.ux.colors.callOutCyan(
          'ops account:signup',
        )}, or sign in with ${this.ux.colors.green(
          '$',
        )} ${this.ux.colors.callOutCyan('ops account:signin')}`,
      )
      this.log('')

      process.exit()
    }
    // console.log('%O', config)

    this.log('\n')
    this.log(
      `${this.ux.colors.green(this.ux.colors.bold('  Email: '))}${
        config.user.email
      }`,
    )
    this.log(
      `${this.ux.colors.green(this.ux.colors.bold('  Username: '))}${
        config.user.username
      }`,
    )
    this.log(
      `${this.ux.colors.green(this.ux.colors.bold('  Team Name: '))}${
        config.team.name
      }`,
    )
    if (config.user.registryHost) {
      this.debug(
        `${this.ux.colors.green(
          this.ux.colors.bold('\n  OPS_REGISTRY_HOST: '),
        )}${config.user.registryHost}`,
      )
    }
    if (config.user.nodeEnv) {
      this.debug(
        `${this.ux.colors.green(this.ux.colors.bold('  NODE_ENV: '))}${
          config.user.nodeEnv
        }`,
      )
    }
    this.log('\n')
  }
}
