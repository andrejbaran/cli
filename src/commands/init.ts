import * as fs from 'fs-extra'
import * as path from 'path'
import * as yaml from 'yaml'
import Command, { flags } from '~/base'
import { COMMAND, OpTypes } from '~/constants/opConfig'
import {
  AnalyticsError,
  CopyTemplateFilesError,
  CouldNotInitializeOp,
  EnumeratingLangsError,
} from '~/errors/CustomErrors'
import { Container, InitParams, InitPaths, Question } from '~/types'
import { appendSuffix, validVersionChars } from '~/utils'
import { asyncPipe } from '~/utils/asyncPipe'

//special handling for the package.json
const javascriptTemplate = 'JavaScript'

export default class Init extends Command {
  static description = 'Easily create a new Op.'
  static flags = {
    help: flags.help({ char: 'h' }),
  }
  static args = [{ name: 'name', description: 'the name of the op to create' }]
  questions: object[] = []

  srcDir = path.resolve(__dirname, '../templates/')
  destDir = path.resolve(process.cwd())

  initPrompts: Container<Question> = {
    [appendSuffix(COMMAND, 'Name')]: {
      type: 'input',
      name: appendSuffix(COMMAND, 'Name'),
      message: `\n Provide a name for your new command ${this.ux.colors.reset.green(
        '→',
      )}\n${this.ux.colors.reset(
        this.ux.colors.secondary('Names must be lowercase'),
      )}\n\n🏷  ${this.ux.colors.white('Name:')}`,
      afterMessage: this.ux.colors.reset.green('✓'),
      afterMessageAppend: this.ux.colors.reset(' added!'),
      validate: this._validateName,
      transformer: input => this.ux.colors.cyan(input.toLocaleLowerCase()),
      filter: input => input.toLowerCase(),
    },
    [appendSuffix(COMMAND, 'Description')]: {
      type: 'input',
      name: appendSuffix(COMMAND, 'Description'),
      message: `\nProvide a description ${this.ux.colors.reset.green(
        '→',
      )}  \n✍️  ${this.ux.colors.white('Description:')}`,
      afterMessage: this.ux.colors.reset.green('✓'),
      afterMessageAppend: this.ux.colors.reset(' added!'),
      validate: this._validateDescription,
    },
    [appendSuffix(COMMAND, 'Version')]: {
      type: 'input',
      name: appendSuffix(COMMAND, 'Version'),
      message: `\nProvide a version ${this.ux.colors.reset.green(
        '→',
      )}  \n✍️  ${this.ux.colors.white('Version:')}`,
      afterMessage: this.ux.colors.reset.green('✓'),
      afterMessageAppend: this.ux.colors.reset(' added!'),
      validate: this._validateVersion,
      default: '0.1.0',
    },
  }

  determineTemplate = async ({
    prompts,
    name,
  }: {
    prompts: Container<Question>
    name: String
  }) => {
    //get list of language templates available
    const langs: Promise<string[]> = this._getLanguagesAvailable(this.srcDir)
    // For now, this is the only type of Op we have
    const templates = [COMMAND]

    let resolvedLangs: string[]
    try {
      resolvedLangs = await langs
    } catch (err) {
      this.debug('%O', err)
      throw new EnumeratingLangsError(err)
    }

    const { lang } = await this.ux.prompt<Partial<InitParams>>({
      type: 'list',
      name: 'lang',
      message: `Which template would you like? ${this.ux.colors.reset.green(
        '→',
      )}`,
      choices: resolvedLangs,
    })
    this.debug('Template folder selected', lang)
    return { prompts, templates, lang, name }
  }

  determineQuestions = ({
    prompts,
    templates,
    lang,
    name,
  }: {
    prompts: Container<Question>
    templates: OpTypes[]
    lang: string
    name: string
  }) => {
    // Filters initPrompts based on the templates selected in determineTemplate
    const removeIfNotSelectedTemplate = ([key, _val]: [string, Question]) => {
      return templates.some(template => key.includes(template))
    }

    const questions = Object.entries(prompts)
      .filter(removeIfNotSelectedTemplate)
      .map(([_key, question]) => question)

    return { questions, templates, lang, name }
  }

  askQuestions = async ({
    questions,
    templates,
    lang,
    name,
  }: {
    questions: Question[]
    templates: OpTypes[]
    lang: string
    name: string
  }) => {
    if (name) {
      const validation = this._validateName(name)
      if (validation != true) {
        this.log(validation)
      } else {
        questions.splice(0, 1)
      }
    }
    const answers = await this.ux.prompt<Partial<InitParams>>(questions)
    if (!answers.commandName) {
      answers.commandName = name
    }
    return { answers, templates, lang }
  }

  determineInitPaths = ({
    answers,
    templates,
    lang,
  }: {
    answers: Partial<InitParams>
    templates: OpTypes[]
    lang: string
  }) => {
    const initParams = { ...answers, templates, lang }
    const { name } = this.getNameAndDescription(initParams)

    const initPaths = {
      sharedDir: `${this.srcDir}/shared/${lang}`,
      destDir: `${this.destDir}/${name}`,
    }
    return { initPaths, initParams }
  }

  copyTemplateFiles = async ({
    initPaths,
    initParams,
  }: {
    initPaths: InitPaths
    initParams: InitParams
  }) => {
    try {
      const { destDir, sharedDir } = initPaths

      await fs.ensureDir(destDir)
      await fs.copy(sharedDir, destDir)
      return { initPaths, initParams }
    } catch (err) {
      this.debug('%O', err)
      throw new CopyTemplateFilesError(err)
    }
  }

  customizePackageJson = async ({
    initPaths,
    initParams,
  }: {
    initPaths: InitPaths
    initParams: InitParams
  }) => {
    // TODO: We probably need to change the go.mod in the Golang template too
    if (initParams.lang === javascriptTemplate) {
      try {
        const { destDir, sharedDir } = initPaths
        const { name, description } = this.getNameAndDescription(initParams)
        const packageObj = JSON.parse(
          fs.readFileSync(`${sharedDir}/package.json`, 'utf8'),
        )
        packageObj.name = name
        packageObj.description = description
        const newPackageString = JSON.stringify(packageObj, null, 2)
        fs.writeFileSync(`${destDir}/package.json`, newPackageString)
        return { initPaths, initParams }
      } catch (err) {
        this.debug('%O', err)
        throw new CouldNotInitializeOp(err)
      }
    } else {
      return { initPaths, initParams }
    }
  }

  customizeYaml = async ({
    initPaths,
    initParams,
  }: {
    initPaths: InitPaths
    initParams: InitParams
  }) => {
    try {
      const { destDir } = initPaths

      // Parse YAML as document so we can work with comments
      const opsYamlDoc = yaml.parseDocument(
        fs.readFileSync(`${destDir}/ops.yml`, 'utf8'),
      )

      await this.customizeOpsYaml(initParams, opsYamlDoc)
      await this.customizeWorkflowYaml(initParams, opsYamlDoc)

      // Get the YAML file as string
      const newOpsString = opsYamlDoc.toString()
      fs.writeFileSync(`${destDir}/ops.yml`, newOpsString)
      return { initPaths, initParams }
    } catch (err) {
      this.debug('%O', err)
      throw new CouldNotInitializeOp(err)
    }
  }

  customizeOpsYaml = async (
    initParams: InitParams,
    yamlDoc: yaml.ast.Document,
  ) => {
    const {
      templates,
      commandName,
      commandDescription,
      commandVersion,
    } = initParams
    if (!templates.includes(COMMAND)) {
      // @ts-ignore
      yamlDoc.delete('commands')
      return
    }
    yamlDoc
      // @ts-ignore
      .getIn(['commands', 0])
      .set('name', `${commandName}:${commandVersion}`)
    // @ts-ignore
    yamlDoc.getIn(['commands', 0]).set('description', commandDescription)
  }

  // TODO: remove this function when workflows are removed from templates
  customizeWorkflowYaml = async (
    initParams: InitParams,
    yamlDoc: yaml.ast.Document,
  ) => {
    // @ts-ignore
    yamlDoc.delete('workflows')
  }

  logMessages = async ({
    initPaths,
    initParams,
  }: {
    initPaths: InitPaths
    initParams: InitParams
  }) => {
    const { destDir } = initPaths
    const { commandName } = initParams
    const { name } = this.getNameAndDescription(initParams)

    this.log(`\n🎉 Success! Your new Op is ready to start coding... \n`)

    fs.readdirSync(`${destDir}`).forEach((file: any) => {
      let callout = ''
      if (file.indexOf('index.js') > -1) {
        callout = `${this.ux.colors.green('←')} ${this.ux.colors.white(
          'Start developing here!',
        )}`
      }
      let msg = this.ux.colors.italic(
        `${path.relative(
          this.destDir,
          process.cwd(),
        )}/${name}/${file} ${callout}`,
      )
      this.log(`📁 .${msg}`)
    })

    this.log(
      `\n🚀 To try out your Op run: ${this.ux.colors.green(
        '$',
      )} ${this.ux.colors.callOutCyan(`ops run ${commandName}`)}`,
    )

    return { initPaths, initParams }
  }

  sendAnalytics = async ({
    initPaths,
    initParams,
  }: {
    initPaths: InitPaths
    initParams: InitParams
  }) => {
    try {
      const { destDir } = initPaths
      const { templates } = initParams
      const { name, description } = this.getNameAndDescription(initParams)
      this.services.analytics.track(
        {
          userId: this.user.email,
          teamId: this.team.id,
          cliEvent: 'Ops CLI Init',
          event: 'Ops CLI Init',
          properties: {
            name,
            team: this.team.name,
            namespace: `@${this.team.name}/${name}`,
            runtime: 'CLI',
            email: this.user.email,
            username: this.user.username,
            path: destDir,
            description,
            templates,
          },
        },
        this.accessToken,
      )
      return {
        initPaths,
        initParams,
      }
    } catch (err) {
      this.debug('%O', err)
      throw new AnalyticsError(err)
    }
  }

  getNameAndDescription = (initParams: Partial<InitParams>) => {
    return {
      name: initParams.commandName,
      description: initParams.commandDescription,
    }
  }

  _validateName(input: string) {
    if (input === '') return 'You need name your op before you can continue'
    if (!input.match('^[a-z0-9_-]*$')) {
      return 'Sorry, please name the Op using only numbers, lowercase letters, -, or _'
    }
    return true
  }

  _validateDescription(input: string) {
    if (input === '')
      return 'You need to provide a description of your op before continuing'
    return true
  }

  async _getLanguagesAvailable(srcdir: string) {
    //get list of language templates available
    let langs: string[] = fs.readdirSync(`${srcdir}/shared`)
    return langs
      .filter((value: string) => {
        try {
          //FIXME: check in parallel?
          return fs.statSync(`${srcdir}/shared/${value}`).isDirectory()
        } catch (error) {
          return false
        }
      })
      .sort((a: string, b: string) => {
        if (a === b) {
          return 0
        } else if (a === javascriptTemplate) {
          return -1
        } else if (b === javascriptTemplate) {
          return 1
        } else {
          return a > b ? 1 : -1
        }
      })
  }

  private _validateVersion(input: string) {
    if (input === '')
      return 'You need to provide a version of your op before continuing'
    if (!input.match(validVersionChars)) {
      return `Sorry, version can only contain letters, digits, underscores, periods and dashes\nand must start and end with a letter or a digit`
    }
    return true
  }

  async run() {
    const {
      args: { name },
    } = this.parse(Init)
    try {
      await this.isLoggedIn()
      const initPipeline = asyncPipe(
        this.determineTemplate,
        this.determineQuestions,
        this.askQuestions,
        this.determineInitPaths,
        this.copyTemplateFiles,
        this.customizePackageJson,
        this.customizeYaml,
        this.sendAnalytics,
        this.logMessages,
      )

      await initPipeline({ prompts: this.initPrompts, name })
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
