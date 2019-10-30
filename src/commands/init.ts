import * as fs from 'fs-extra'
import * as path from 'path'
import * as yaml from 'yaml'
import Command, { flags } from '~/base'
import { Container, InitParams, InitPaths, Question } from '~/types'
import { asyncPipe } from '~/utils/asyncPipe'
import {
  AnalyticsError,
  CopyTemplateFilesError,
  CouldNotInitializeOp,
} from '~/errors/CustomErrors'
import {
  WORKFLOW,
  COMMAND,
  OpTypes,
  HELP_COMMENTS,
  YAML_TYPE_SEQUENCE,
  YAML_TYPE_STRING,
} from '~/constants/opConfig'
import { titleCase, appendSuffix } from '~/utils'

export default class Init extends Command {
  static description = 'Easily create a new op.'
  static flags = {
    help: flags.help({ char: 'h' }),
  }
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
      )}  \n📝 ${this.ux.colors.white('Description:')}`,
      afterMessage: this.ux.colors.reset.green('✓'),
      afterMessageAppend: this.ux.colors.reset(' added!'),
      validate: this._validateDescription,
    },
    [appendSuffix(WORKFLOW, 'Name')]: {
      type: 'input',
      name: appendSuffix(WORKFLOW, 'Name'),
      message: `\n Provide a name for your new workflow ${this.ux.colors.reset.green(
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
    [appendSuffix(WORKFLOW, 'Description')]: {
      type: 'input',
      name: appendSuffix(WORKFLOW, 'Description'),
      message: `\nProvide a description ${this.ux.colors.reset.green(
        '→',
      )}\n\n📝 ${this.ux.colors.white('Description:')}`,
      afterMessage: this.ux.colors.reset.green('✓'),
      afterMessageAppend: this.ux.colors.reset(' added!'),
      validate: this._validateDescription,
    },
  }

  determineTemplate = async (prompts: Container<Question>) => {
    const { templates } = await this.ux.prompt<Partial<InitParams>>({
      type: 'checkbox',
      name: 'templates',
      message: `\n What type of op would you like to create ${this.ux.colors.reset.green(
        '→',
      )}`,
      choices: [
        {
          name: `${titleCase(
            COMMAND,
          )} - A template for building commands which can be distributed via The Ops Platform.`,
          value: COMMAND,
        },
        {
          name: `${titleCase(
            WORKFLOW,
          )} - A template for combining many commands into a workflow which can be distributed via The Ops Platform.`,
          value: WORKFLOW,
        },
      ],
      afterMessage: `${this.ux.colors.reset.green('✓')}`,
      validate: input => input.length != 0,
    })
    return { prompts, templates }
  }

  determineQuestions = ({
    prompts,
    templates,
  }: {
    prompts: Container<Question>
    templates: OpTypes[]
  }) => {
    // Filters initPrompts based on the templates selected in determineTemplate
    const removeIfNotSelectedTemplate = ([key, _val]: [string, Question]) => {
      return key.includes(templates[0]) || key.includes(templates[1])
    }

    const questions = Object.entries(prompts)
      .filter(removeIfNotSelectedTemplate)
      .map(([_key, question]) => question)

    return { questions, templates }
  }

  askQuestions = async ({
    questions,
    templates,
  }: {
    questions: Question[]
    templates: OpTypes[]
  }) => {
    const answers = await this.ux.prompt<Partial<InitParams>>(questions)
    return { answers, templates }
  }

  determineInitPaths = ({
    answers,
    templates,
  }: {
    answers: Partial<InitParams>
    templates: OpTypes[]
  }) => {
    const initParams = { ...answers, templates }
    const { name } = this.getNameAndDescription(initParams)
    const sharedDir = `${this.srcDir}/shared`
    const destDir = `${this.destDir}/${name}`
    const initPaths = { sharedDir, destDir }
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
      const { templates } = initParams
      const { destDir, sharedDir } = initPaths

      await fs.ensureDir(destDir)
      // copies op files if selected
      if (templates.includes(COMMAND)) {
        await fs.copy(`${this.srcDir}/${COMMAND}`, destDir)
      }
      // copies shared files
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

      // Process each root level section of the YAML file & add comments
      Object.keys(HELP_COMMENTS).forEach(rootKey => {
        this.addHelpCommentsFor(rootKey, opsYamlDoc)
      })

      // Get the YAML file as string
      const newOpsString = opsYamlDoc.toString()
      fs.writeFileSync(`${destDir}/ops.yml`, newOpsString)
      return { initPaths, initParams }
    } catch (err) {
      this.debug('%O', err)
      throw new CouldNotInitializeOp(err)
    }
  }

  // The `yaml` library has a pretty bad API for handling comments
  // More: https://eemeli.org/yaml/#comments'
  // TODO: Review type checking for yamlDoc (yaml.ast.Document) & remove tsignores
  addHelpCommentsFor = (key: string, yamlDoc: yaml.ast.Document) => {
    const docContents = yamlDoc.contents as yaml.ast.SeqNode
    const docContentsItems = docContents.items as Array<yaml.ast.Pair | null>
    const configItem = docContentsItems.find(item => {
      if (!item || !item.key) return
      const itemKey = item.key as yaml.ast.Scalar
      return itemKey.value === key
    })

    // Simple config fields (`version`)
    if (
      configItem &&
      configItem.value &&
      configItem.value.type === YAML_TYPE_STRING &&
      HELP_COMMENTS[key]
    ) {
      configItem.comment = ` ${HELP_COMMENTS[key]}`
    }

    // Config fields with nested values (`ops`, `workflows`)
    if (
      configItem &&
      configItem.value &&
      configItem.value.type === YAML_TYPE_SEQUENCE
    ) {
      // @ts-ignore
      yamlDoc.getIn([key, 0]).items.map(configItem => {
        const comment: string = HELP_COMMENTS[key][configItem.key]
        if (comment)
          configItem.comment = ` ${HELP_COMMENTS[key][configItem.key]}`
      })
    }
  }

  customizeOpsYaml = async (
    initParams: InitParams,
    yamlDoc: yaml.ast.Document,
  ) => {
    const { templates, commandName, commandDescription } = initParams
    if (!templates.includes(COMMAND)) {
      // @ts-ignore
      yamlDoc.delete('ops')
      return
    }
    // @ts-ignore
    yamlDoc.getIn(['ops', 0]).set('name', commandName)
    // @ts-ignore
    yamlDoc.getIn(['ops', 0]).set('description', commandDescription)
  }

  customizeWorkflowYaml = async (
    initParams: InitParams,
    yamlDoc: yaml.ast.Document,
  ) => {
    const { templates, workflowName, workflowDescription } = initParams
    if (!templates.includes(WORKFLOW)) {
      // @ts-ignore
      yamlDoc.delete('workflows')
      return
    }
    // @ts-ignore
    yamlDoc.getIn(['workflows', 0]).set('name', workflowName)
    // @ts-ignore
    yamlDoc.getIn(['workflows', 0]).set('description', workflowDescription)
  }

  logMessages = async ({
    initPaths,
    initParams,
  }: {
    initPaths: InitPaths
    initParams: InitParams
  }) => {
    const { destDir } = initPaths
    const { templates } = initParams
    const { name } = this.getNameAndDescription(initParams)

    this.logSuccessMessage(templates)

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

    if (templates.includes(COMMAND)) {
      this.logCommandMessage(initParams)
    }

    if (templates.includes(WORKFLOW)) {
      this.logWorkflowMessage(initParams)
    }

    return { initPaths, initParams }
  }

  logCommandMessage = (initParams: InitParams) => {
    const { commandName } = initParams
    this.log(
      `\n🚀 To test your ${COMMAND} run: ${this.ux.colors.green(
        '$',
      )} ${this.ux.colors.callOutCyan(`ops run ${commandName}`)}`,
    )
  }

  logWorkflowMessage = (initParams: InitParams) => {
    const { workflowName } = initParams
    const { name } = this.getNameAndDescription(initParams)
    this.log(
      `\n🚀 To test your ${WORKFLOW} run: ${this.ux.colors.green(
        '$',
      )} ${this.ux.colors.callOutCyan(
        `cd ${name} && npm install && ops run .`,
      )}`,
    )
  }

  logSuccessMessage = (templates: OpTypes[]) => {
    const successMessageBoth = `\n🎉 Success! Your ${COMMAND} and ${WORKFLOW} template Ops are ready to start coding... \n`
    const getSuccessMessage = (opType: string) =>
      `\n🎉 Success! Your ${opType} template Op is ready to start coding... \n`

    if (templates.includes(COMMAND) && templates.includes(WORKFLOW)) {
      return this.log(successMessageBoth)
    }

    const opType = templates.includes(COMMAND) ? COMMAND : WORKFLOW

    return this.log(getSuccessMessage(opType))
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
          event: 'Ops CLI Init',
          properties: {
            email: this.user.email,
            username: this.user.username,
            path: destDir,
            name,
            description,
            templates,
          },
        },
        this.accessToken,
      )
    } catch (err) {
      this.debug('%O', err)
      throw new AnalyticsError(err)
    }
  }

  getNameAndDescription = (initParams: Partial<InitParams>) => {
    return {
      name: initParams.commandName || initParams.workflowName,
      description:
        initParams.commandDescription || initParams.workflowDescription,
    }
  }

  _validateName(input: string) {
    if (input === '') return 'You need name your op before you can continue'
    if (!input.match('^[a-z0-9_-]*$')) {
      return 'Sorry, please name the Op using only numbers, letters, -, or _'
    }
    return true
  }

  _validateDescription(input: string) {
    if (input === '')
      return 'You need to provide a description of your op before continuing'
    return true
  }

  async run() {
    this.parse(Init)
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
        this.logMessages,
        this.sendAnalytics,
      )

      await initPipeline(this.initPrompts)
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
