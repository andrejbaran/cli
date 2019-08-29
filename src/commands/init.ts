import { ux } from '@cto.ai/sdk'
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
import { WORKFLOW, OP, OpTypes } from '~/constants/opConfig'
import { classProperty } from '@babel/types'

export default class Init extends Command {
  static description = 'Easily create a new op.'
  static flags = {
    help: flags.help({ char: 'h' }),
  }
  questions: object[] = []

  srcDir = path.resolve(__dirname, '../templates/')
  destDir = path.resolve(process.cwd())
  opName = ''
  opDescription = ''

  initPrompts: Container<Question> = {
    opName: {
      type: 'input',
      name: 'opName',
      message: `\n Provide a name for your new op ${ux.colors.reset.green(
        '→',
      )}\n${ux.colors.reset(
        ux.colors.secondary('Names must be lowercase'),
      )}\n\n🏷  ${ux.colors.white('Name:')}`,
      afterMessage: ux.colors.reset.green('✓'),
      afterMessageAppend: ux.colors.reset(' added!'),
      validate: this._validateName,
      transformer: input => ux.colors.cyan(input.toLocaleLowerCase()),
      filter: input => input.toLowerCase(),
    },
    opDescription: {
      type: 'input',
      name: 'opDescription',
      message: `\nProvide a description ${ux.colors.reset.green(
        '→',
      )}  \n📝 ${ux.colors.white('Description:')}`,
      afterMessage: ux.colors.reset.green('✓'),
      afterMessageAppend: ux.colors.reset(' added!'),
      validate: this._validateDescription,
    },
    workflowName: {
      type: 'input',
      name: 'workflowName',
      message: `\n Provide a name for your new workflow ${ux.colors.reset.green(
        '→',
      )}\n${ux.colors.reset(
        ux.colors.secondary('Names must be lowercase'),
      )}\n\n🏷  ${ux.colors.white('Name:')}`,
      afterMessage: ux.colors.reset.green('✓'),
      afterMessageAppend: ux.colors.reset(' added!'),
      validate: this._validateName,
      transformer: input => ux.colors.cyan(input.toLocaleLowerCase()),
      filter: input => input.toLowerCase(),
    },
    workflowDescription: {
      type: 'input',
      name: 'workflowDescription',
      message: `\nProvide a description ${ux.colors.reset.green(
        '→',
      )}\n\n📝 ${ux.colors.white('Description:')}`,
      afterMessage: ux.colors.reset.green('✓'),
      afterMessageAppend: ux.colors.reset(' added!'),
      validate: this._validateDescription,
    },
  }

  determineTemplate = async (prompts: Container<Question>) => {
    const { templates } = await ux.prompt<Partial<InitParams>>({
      type: 'checkbox',
      name: 'templates',
      message: `\n What type of op would you like to create ${ux.colors.reset.green(
        '→',
      )}`,
      choices: [
        {
          name:
            'Command - A template for building commands which can be distributed via The Ops Platform.',
          value: OP,
        },
        {
          name:
            'Workflow - A template for combining many commands into a workflow which can be distributed via The Ops Platform.',
          value: WORKFLOW,
        },
      ],
      afterMessage: `${ux.colors.reset.green('✓')}`,
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
    const removeIfNotSelectedTemplate = prompt => {
      return (
        prompt[0].includes(templates[0]) || prompt[0].includes(templates[1])
      )
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
    const answers = await ux.prompt<Partial<InitParams>>(questions)
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
      if (templates.includes(OP)) {
        await fs.copy(`${this.srcDir}/${OP}`, destDir)
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

      const opsYamlObj = yaml.parse(
        fs.readFileSync(`${destDir}/ops.yml`, 'utf8'),
      )
      await this.customizeOpsYaml(initParams, opsYamlObj)
      await this.customizeWorkflowYaml(initParams, opsYamlObj)

      const newOpsString = yaml.stringify(opsYamlObj)
      fs.writeFileSync(`${destDir}/ops.yml`, newOpsString)
      return { initPaths, initParams }
    } catch (err) {
      this.debug('%O', err)
      throw new CouldNotInitializeOp(err)
    }
  }

  customizeOpsYaml = async (initParams, opsYamlObj) => {
    const { templates, opName, opDescription } = initParams
    if (!templates.includes(OP)) {
      delete opsYamlObj.ops
      return
    }
    opsYamlObj.ops[0].name = opName
    opsYamlObj.ops[0].description = opDescription
  }

  customizeWorkflowYaml = async (initParams, opsYamlObj) => {
    const { templates, workflowName, workflowDescription } = initParams
    if (!templates.includes(WORKFLOW)) {
      delete opsYamlObj.workflows
      return
    }
    opsYamlObj.workflows[0].name = workflowName
    opsYamlObj.workflows[0].description = workflowDescription
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

    if (templates.includes(OP)) {
      this.logOpsMessage(initParams)
    }

    if (templates.includes(WORKFLOW)) {
      this.logWorkflowMessage(initParams)
    }

    return { initPaths, initParams }
  }

  logOpsMessage = initParams => {
    const { opName } = initParams
    this.log(
      `\n🚀 To test your op run: ${ux.colors.green(
        '$',
      )} ${ux.colors.callOutCyan(`ops run ${opName}`)}`,
    )
  }

  logWorkflowMessage = initParams => {
    const { workflowName } = initParams
    const { name } = this.getNameAndDescription(initParams)
    this.log(
      `\n🚀 To test your workflow run: ${ux.colors.green(
        '$',
      )} ${ux.colors.callOutCyan(
        `cd ${name} && npm install && ops run ${workflowName}`,
      )}`,
    )
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

  private getNameAndDescription = (initParams: Partial<InitParams>) => {
    return {
      name: initParams.opName || initParams.workflowName,
      description: initParams.opDescription || initParams.workflowDescription,
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
