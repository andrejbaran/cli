import Command, { flags } from '../base'
import { Config } from '../types'

export default class Whoami extends Command {
  static description = 'Display your user information'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  async run() {
    this.parse(Whoami)
    const config = await this.isLoggedIn()

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
    this.services.analytics.track(
      {
        userId: this.user.email,
        teamId: this.team.id,
        cliEvent: 'Ops CLI Whoami',
        event: 'Ops CLI Whoami',
        properties: {},
      },
      this.accessToken,
    )
  }
}
