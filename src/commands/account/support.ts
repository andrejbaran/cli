import Command, {flags} from '../../base'
const {ux} = require('@cto.ai/sdk')

export default class AccountSupport extends Command {
  static description = 'Contact our support team with questions.'

  static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    name: flags.string({char: 'n', description: 'name to print'}),
    // flag with no value (-f, --force)
    force: flags.boolean({char: 'f'}),
  }

  static args = [{name: 'file'}]

  async run(this:any) {
    const {args, flags} = this.parse(AccountSupport)

    this.log('')
    this.log('❔ Please reach out to us with questions anytime!')
    this.log(`⌚️ We are typically available ${ux.colors.white('Monday-Friday 9am-5pm PT')}.`)
    this.log(`📬 You can always reach us by ${ux.url('email', 'mailto:h1gw0mit@ctoai.intercom-mail.com')} ${ux.colors.dim('(h1gw0mit@ctoai.intercom-mail.com)')}.\n`)
    this.log("🖖 We'll get back to you as soon as we possibly can.")
    this.log('')

    this.analytics.track({
      userId: this.user.email,
      event: 'Ops CLI Support',
      properties: {}
    })

  }
}
