import { ux } from '@cto.ai/sdk'
import { Question } from 'inquirer'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as yaml from 'yaml'
import Command, { flags } from '~/base'
import { Container, InitParams, InitPaths, CtoQuestion } from '~/types'
import { asyncPipe } from '~/utils/asyncPipe'
import {
  AnalyticsError,
  CopyTemplateFilesError,
  CouldNotInitializeOp,
} from '~/errors/customErrors'
import { LOCAL, CONTAINER } from '~/constants/opConfig'

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

  srcDir = path.resolve(__dirname, '../templates/')
  destDir = path.resolve(process.cwd())
  opName = ''
  opDescription = ''

  initPrompts: Container<CtoQuestion> = {
    template: {
      type: 'list',
      name: 'template',
      message: `\n What type of op would you like to create ${ux.colors.reset.green(
        '→',
      )}`,
      choices: [
        { name: 'Local Op', value: LOCAL },
        { name: 'Container Op', value: CONTAINER },
      ],
      afterMessage: `${ux.colors.reset.green('✓')}`,
    },
    name: {
      type: 'input',
      name: 'name',
      message: `\n Provide a name for your new op ${ux.colors.reset.green(
        '→',
      )}  \n🏷  ${ux.colors.white('Name:')}`,
      afterMessage: `${ux.colors.reset.green('✓')}`,
      afterMessageAppend: `${ux.colors.reset(' added!')}`,
      validate: this._validateName,
    },
    description: {
      type: 'input',
      name: 'description',
      message: `\nProvide a description ${ux.colors.reset.green(
        '→',
      )}  \n📝 ${ux.colors.white('Description:')}`,
      afterMessage: `${ux.colors.reset.green('✓')}`,
      afterMessageAppend: `${ux.colors.reset(' added!')}`,
      validate: this._validateDescription,
    },
  }

  determineQuestions = ({
    prompts,
    flags,
  }: {
    prompts: Container<Question>
    flags: Partial<InitParams>
  }) => {
    const removeIfPassedToFlags = ([key, _question]: [string, Question]) =>
      !Object.entries(flags)
        .map(([flagKey]) => flagKey)
        .includes(key)

    const questions = Object.entries(prompts)
      .filter(removeIfPassedToFlags)
      .map(([_key, question]) => question)

    return questions
  }

  askQuestions = async (questions: Question[]) => {
    return ux.prompt(questions)
  }

  determineInitPaths = (flags: Partial<InitParams>) => (
    answers: Partial<InitParams>,
  ) => {
    const initParams = { ...flags, ...answers }
    const { template, name } = initParams
    const templateDir = `${this.srcDir}/${template}`
    const sharedDir = `${this.srcDir}/shared`
    const destDir = `${this.destDir}/${name}`
    const initPaths = { templateDir, sharedDir, destDir }
    return { initPaths, initParams }
  }

  copyTemplateFiles = async (input: {
    initPaths: InitPaths
    initParams: InitParams
  }) => {
    try {
      const { destDir, templateDir, sharedDir } = input.initPaths

      await fs.ensureDir(destDir)
      // copies select template files
      await fs.copy(templateDir, destDir)
      // copies shared files for both
      await fs.copy(sharedDir, destDir)
      return input
    } catch (err) {
      throw new CopyTemplateFilesError(err)
    }
  }

  customizePackageJson = async (input: {
    initPaths: InitPaths
    initParams: InitParams
  }) => {
    try {
      const { destDir, sharedDir } = input.initPaths
      const { name, description } = input.initParams
      const packageObj = JSON.parse(
        fs.readFileSync(`${sharedDir}/package.json`, 'utf8'),
      )
      packageObj.name = name
      packageObj.description = description
      const newPackageString = JSON.stringify(packageObj, null, 2)
      fs.writeFileSync(`${destDir}/package.json`, newPackageString)
      return input
    } catch (err) {
      throw new CouldNotInitializeOp(err)
    }
  }

  customizeOpsYaml = async (input: {
    initPaths: InitPaths
    initParams: InitParams
  }) => {
    try {
      const { destDir } = input.initPaths
      const { name, description, template } = input.initParams
      const opsYamlObj = yaml.parse(
        fs.readFileSync(`${destDir}/ops.yml`, 'utf8'),
      )
      if (template === LOCAL) {
        opsYamlObj.ops[0].name = name
        opsYamlObj.ops[0].description = description
      } else {
        opsYamlObj.name = name
        opsYamlObj.description = description
      }
      const newOpsString = yaml.stringify(opsYamlObj)
      fs.writeFileSync(`${destDir}/ops.yml`, newOpsString)
      return input
    } catch (err) {
      throw new CouldNotInitializeOp(err)
    }
  }

  logMessages = async (input: {
    initPaths: InitPaths
    initParams: InitParams
  }) => {
    const { destDir } = input.initPaths
    const { name } = input.initParams
    this.log('\n🎉 Success! Your op is ready to start coding... \n')
    fs.readdirSync(`${destDir}`).forEach((file: any) => {
      let callout = ''
      if (file.indexOf('index.js') > -1) {
        callout = `${ux.colors.green('←')} ${ux.colors.white(
          'Start developing here!',
        )}`
      }
      let msg = ux.colors.italic(
        `${path.relative(
          this.destDir,
          process.cwd(),
        )}/${name}/${file} ${callout}`,
      )
      this.log(`📁 .${msg}`)
    })
    this.log(
      `\n🚀 Now test your op with: ${ux.colors.green(
        '$',
      )} ops run ${ux.colors.callOutCyan(name)}\n`,
    )
    return input
  }

  trackAnalytics = async (input: {
    initPaths: InitPaths
    initParams: InitParams
  }) => {
    try {
      const { destDir } = input.initPaths
      const { name, description, template } = input.initParams
      this.analytics.track({
        userId: this.user.email,
        event: 'Ops CLI Init',
        properties: {
          email: this.user.email,
          username: this.user.username,
          path: destDir,
          name,
          description,
          template,
        },
      })
    } catch (err) {
      throw new AnalyticsError(err)
    }
  }

  private _validateName(input: string) {
    if (input === '') return 'You need name your op before you can continue'
    if (!input.match('^[a-z0-9_-]*$')) {
      return 'Sorry, please name the Op using only numbers, letters, -, or _'
    }
    return true
  }

  private _validateDescription(input: string) {
    if (input === '')
      return 'You need to provide a description of your op before continuing'
    return true
  }

  async run() {
    try {
      const { flags } = this.parse(Init)
      this.isLoggedIn()

      const initPipeline = asyncPipe(
        this.determineQuestions,
        this.askQuestions,
        this.determineInitPaths(flags),
        this.copyTemplateFiles,
        this.customizePackageJson,
        this.customizeOpsYaml,
        this.logMessages,
        this.trackAnalytics,
      )

      await initPipeline({ prompts: this.initPrompts, flags })
    } catch (err) {
      this.debug(err)
      this.config.runHook('error', { err })
    }
  }
}
