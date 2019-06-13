import Command, { flags } from '../base'
import { Config } from '../types'
import { isTruthy } from '../utils'
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

    console.log('\n')
    console.log(
      `${this.ux.colors.green(this.ux.colors.bold('  Email: '))}${
        config.user.email
      }`,
    )
    console.log(
      `${this.ux.colors.green(this.ux.colors.bold('  Username: '))}${
        config.user.username
      }`,
    )
    console.log(
      `${this.ux.colors.green(this.ux.colors.bold('  Team Name: '))}${
        config.team.name
      }`,
    )
    if (isTruthy(DEBUG) && config.user.registryHost) {
      console.log(
        `${this.ux.colors.green(
          this.ux.colors.bold('\n  OPS_REGISTRY_HOST: '),
        )}${config.user.registryHost}`,
      )
    }
    if (isTruthy(DEBUG) && config.user.nodeEnv) {
      console.log(
        `${this.ux.colors.green(this.ux.colors.bold('  NODE_ENV: '))}${
          config.user.nodeEnv
        }`,
      )
    }
    console.log('\n')
  }
}
