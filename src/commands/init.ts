import * as path from 'path'

import Command, {flags} from '../base'

const {ux} = require('@cto.ai/sdk')
const fs = require('fs-extra')
const yaml = require('yaml')

export default class Init extends Command {
  static description = 'Easily create a new op.'

  static flags = {
    help: flags.help({char: 'h'}),
    name: flags.string({char: 'n', description: 'op name'}),
    description: flags.string({char: 'd', description: 'op description'}),
  }
  questions: object[] = []

  namePrompt = {
    type: 'input',
    name: 'name',
    message: `\nName your op to begin ${ux.colors.reset.green(
      '→'
    )}  \n🏷  ${ux.colors.white('Name of op')}`,
    afterMessage: `${ux.colors.reset.green('✓')}`,
    afterMessageAppend: `${ux.colors.reset(' created!')}`,
    validate: this._validateName
  }

  descriptionPrompt = {
    type: 'input',
    name: 'description',
    message: `\nDescribe what your op does ${ux.colors.reset.green(
      '→'
    )}  \n📝 ${ux.colors.white('Ops details')}`,
    afterMessage: `${ux.colors.reset.green('✓')}`,
    afterMessageAppend: `${ux.colors.reset(' added!')}`,
    validate: this._validateDescription
  }

  async run(this: any) {
    let self = this
    const {flags} = this.parse(Init)
    self.isLoggedIn()
    let name = flags.name
    let description = flags.description
    const src = path.resolve(`${__dirname}/../template`)
    const dest = path.resolve(process.cwd())

    if (!name) self.questions.push(self.namePrompt)
    if (!description) self.questions.push(self.descriptionPrompt)
    if (self.questions.length) {
      const answers = await ux.prompt(self.questions)
      if (answers.name) name = answers.name
      if (answers.description) description = answers.description
    }
    try {
      await fs.ensureDir(`${dest}/${name}`)
      await fs.copy(src, `${dest}/${name}`)
    } catch (err) {
      console.error(err)
    }
    let manifest = await fs.readFile(`${dest}/${name}/ops.yml`, 'utf8')
    let op = yaml.parse(manifest)
    op.name = name
    op.description = description
    manifest = yaml.stringify(op)
    await fs.writeFile(`${dest}/${name}/ops.yml`, manifest)

    self.log('\n🎉 Success! Your op is ready to be worked on.')
    fs.readdirSync(`${dest}/${name}`).forEach((file: any) => {
      let msg = ux.colors.italic(
        `${path.relative(dest, process.cwd())}/${name}/${file}`
      )
      self.log(`📁 .${msg}`)
    })
    self.log('\n🚀 Run the following to test your new op:')
    self.log(`${ux.colors.green('$')} ops run ${ux.colors.callOutCyan(name)}`)

    self.analytics.track({
      userId: self.user.email,
      event: 'Ops CLI Init',
      properties: {
        email: self.user.email,
        username: self.user.username,
        name,
        path: dest
      }
    })
  }

  _validateName(input) {
    if (input === '') return 'Please provide a op name'
    if (!input.match('^[a-z0-9_-]*$')) {
      return 'Op Name must only contain numbers, letters, -, or _'
    }
    return true
  }

  _validateDescription(input) {
    if (input === '') return 'Please provide a op description'
    return true
  }
}
