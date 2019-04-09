import * as path from 'path'

import Command, {flags} from '../base'

const {ux} = require('@cto.ai/sdk')
const fs = require('fs-extra')

export default class Init extends Command {
  static description = 'Easily create a new op.'

  static flags = {
    help: flags.help({char: 'h'}),
    name: flags.string({char: 'n', description: 'op name'}),
  }
  questions: object[] = []

  namePrompt = {
    type: 'input',
    name: 'name',
    message: '👉 What is the name of your op?'
  }

  async run(this:any) {
    const {flags} = this.parse(Init)

    this.isLoggedIn()

    let name = flags.name
    const src = path.resolve(`${__dirname}/../template`)
    const dest = path.resolve(process.cwd())

    if (!name) {
      const answers = await ux.prompt(this.namePrompt)
      name = answers.name
    }

    ux.spinner.start(`🛠 Creating op: ${ux.colors.italic.bold(name)}`)

    try {
      await fs.ensureDir(`${dest}/${name}`)
      await fs.copy(src, `${dest}/${name}`)
      ux.spinner.stop()
    } catch (err) {
      console.error(err)
    }

    let self = this
    fs.readdirSync(`${dest}/${name}`).forEach((file: any) => {
      let msg = ux.colors.italic(
        `${path.relative(dest, process.cwd())}/${name}/${file}`
      )
      self.log(`${ux.colors.green('>')} .${msg}`)
    })

    this.analytics.track({
      userId: this.user.email,
      event: 'Ops CLI Init',
      properties: {
        email: this.user.email,
        username: this.user.username,
        name,
        path: dest
      }
    })

  }
}
