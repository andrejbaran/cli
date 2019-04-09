import Command, {flags} from '../../base'
const {ux} = require('@cto.ai/sdk')

const questions: object[] = []
let emailPrompt = {
  type: 'input',
  name: 'email',
  message: 'Enter email: ',
}
const passwordPrompt = {
  type: 'password',
  name: 'password',
  message: 'Enter password: ',
  mask: '*'
}
export default class AccountSignin extends Command {
  static description = 'Logs in to your account'

  static flags = {
    help: flags.help({char: 'h'}),
    email: flags.string({char: 'e'}),
    password: flags.string({char: 'p'})
  }

  async run() {
    this.log('')
    this.log(
      `💻 ${ux.colors.multiBlue('CTO.ai Ops')} - ${ux.colors.actionBlue(
        'The CLI built for Teams'
      )} 🚀`
    )
    this.log('')

    this.log(`👋 ${ux.colors.white('Welcome to the')} ${ux.colors.callOutCyan('Ops CLI beta')}! \n`)

    const {flags} = this.parse(AccountSignin)
    const {email, password} = flags

    let answers = {email, password}
    if (!email) questions.push(emailPrompt)
    if (!password) questions.push(passwordPrompt)

    if (questions.length) {
      this.log(`${ux.colors.white('Please login to get started.')}\n`)
      const res = await ux.prompt(questions)
      answers = {...answers, ...res}
    }

    this.log('')
    ux.spinner.start(`${ux.colors.white('Authenticating')}`)
    const res = await this.localAuthenticate(answers.email, answers.password)

    await this.writeConfig(res)

    ux.spinner.stop(`${ux.colors.green('Done!')}`)
    this.log(`\n👋 ${ux.colors.white('Welcome back')} ${ux.colors.italic.dim(res.user.username)}!`)
    this.log(`\n👉 Type ${ux.colors.italic.dim('ops search')} to find ops or ${ux.colors.italic.dim('ops init')} to create your own! \n`)

    this.analytics.identify({
      userId: res.user.email,
      traits: {
        email: res.user.email,
        username: res.user.username
      }
    })

    this.analytics.track({
      userId: res.user.email,
      event: 'Ops CLI Signin',
      properties: {
        email: res.user.email,
        username: res.user.username
      }
    })
  }
}
