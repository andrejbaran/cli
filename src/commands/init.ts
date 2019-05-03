import { ux } from '@cto.ai/sdk'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as yaml from 'yaml'
import Command, { flags } from '../base'
import { CopyTemplateFilesError } from '../errors'

export default class Init extends Command {
  static description = 'Easily create a new op.'
  static flags = {
    help: flags.help({ char: 'h' }),
    name: flags.string({ char: 'n', description: 'Name of the op.' }),
    description: flags.string({
      char: 'd',
      description: 'Description of the op.',
    }),
  }
  questions: object[] = []

  srcDir = path.resolve(__dirname, '../template')
  destDir = path.resolve(process.cwd())
  opName = ''
  opDescription = ''

  namePrompt = {
    type: 'input',
    name: 'name',
    message: `Provide a name for your new op ${ux.colors.reset.green(
      '→',
    )}  \n🏷  ${ux.colors.white('Name:')}`,
    afterMessage: `${ux.colors.reset.green('✓')}`,
    afterMessageAppend: `${ux.colors.reset(' added!')}`,
    validate: this._validateName,
  }

  descriptionPrompt = {
    type: 'input',
    name: 'description',
    message: `\nProvide a description ${ux.colors.reset.green(
      '→',
    )}  \n📝 ${ux.colors.white('Description:')}`,
    afterMessage: `${ux.colors.reset.green('✓')}`,
    afterMessageAppend: `${ux.colors.reset(' added!')}`,
    validate: this._validateDescription,
  }

  private _assignFlags() {
    const { flags } = this.parse(Init)
    this.opName = flags.name || ''
    this.opDescription = flags.description || ''
  }

  private async _askQuestions() {
    if (!this.opName) this.questions.push(this.namePrompt)
    if (!this.opDescription) this.questions.push(this.descriptionPrompt)

    if (this.questions.length) {
      const answers = await ux.prompt(this.questions)
      if (answers.name) this.opName = answers.name
      if (answers.description) this.opDescription = answers.description
    }
  }

  private _customizePackageJson() {
    const packageObj = JSON.parse(
      fs.readFileSync(`${this.srcDir}/package.json`, 'utf8'),
    )
    packageObj.name = this.opName
    packageObj.description = this.opDescription

    const newPackageString = JSON.stringify(packageObj, null, 2)

    fs.writeFileSync(
      `${this.destDir}/${this.opName}/package.json`,
      newPackageString,
    )
  }

  private _customizeOpsYaml() {
    const opsYamlObj = yaml.parse(
      fs.readFileSync(`${this.destDir}/${this.opName}/ops.yml`, 'utf8'),
    )
    opsYamlObj.name = this.opName
    opsYamlObj.description = this.opDescription

    const newOpsString = yaml.stringify(opsYamlObj)

    fs.writeFileSync(`${this.destDir}/${this.opName}/ops.yml`, newOpsString)
  }

  private async _copyTemplateFiles() {
    try {
      await fs.ensureDir(`${this.destDir}/${this.opName}`)
      await fs.copy(this.srcDir, `${this.destDir}/${this.opName}`)
      this._customizePackageJson()
      this._customizeOpsYaml()
    } catch (err) {
      throw new CopyTemplateFilesError(err)
    }
  }

  private _logMessages() {
    this.log('\n🎉 Success! Your op is ready to start coding... \n')

    fs.readdirSync(`${this.destDir}/${this.opName}`).forEach((file: any) => {
      let callout = ''
      if (file.indexOf('index.js') > -1) {
        callout = `${ux.colors.green('←')} ${ux.colors.white(
          'Start developing here!',
        )}`
      }
      let msg = ux.colors.italic(
        `${path.relative(this.destDir, process.cwd())}/${
          this.opName
        }/${file} ${callout}`,
      )
      this.log(`📁 .${msg}`)
    })
    this.log(
      `\n🚀 Now test your op with: ${ux.colors.green(
        '$',
      )} ops run ${ux.colors.callOutCyan(this.opName)}\n`,
    )
  }

  private _trackAnalytics() {
    this.analytics.track({
      userId: this.user.email,
      event: 'Ops CLI Init',
      properties: {
        email: this.user.email,
        username: this.user.username,
        path: this.destDir,
        name: this.opName,
        description: this.opDescription,
      },
    })
  }

  _validateName(input: string) {
    if (input === '') return 'Please provide a op name'
    if (!input.match('^[a-z0-9_-]*$')) {
      return 'Op Name must only contain numbers, letters, -, or _'
    }
    return true
  }

  _validateDescription(input: string) {
    if (input === '') return 'Please provide a op description'
    return true
  }

  async run() {
    try {
      this.isLoggedIn()
      this._assignFlags()
      await this._askQuestions()
      await this._copyTemplateFiles()
      this._logMessages()
      this._trackAnalytics()
    } catch (err) {
      this.config.runHook('error', { err })
    }
  }
}
