import Command, { flags } from '../../base'
import { ux } from '@cto.ai/sdk'
import { INTERCOM_EMAIL } from '../../constants/env'
export default class AccountSupport extends Command {
  static description = 'Contact our support team with questions.'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  async run(this: any) {
    this.parse(AccountSupport)
    await this.isLoggedIn()

    this.log('')
    this.log('❔ Please reach out to us with questions anytime!')
    this.log(
      `⌚️ We are typically available ${ux.colors.white(
        'Monday-Friday 9am-5pm PT',
      )}.`,
    )
    this.log(
      `📬 You can always reach us by ${this.ux.url(
        'email',
        `mailto:${INTERCOM_EMAIL}`,
      )} ${this.ux.colors.dim(`(${INTERCOM_EMAIL})`)}.\n`,
    )
    this.log("🖖 We'll get back to you as soon as we possibly can.")
    this.log('')

    this.services.analytics.track(
      {
        userId: this.user.email,
        teamId: this.team.id,
        event: 'Ops CLI Support',
        properties: {},
      },
      this.accessToken,
    )
  }
}
