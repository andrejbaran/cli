/**
 * @author: Brett Campbell (brett@hackcapital.com)
 * @date: Saturday, 6th April 2019 10:39:58 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Wednesday, 12th June 2019 1:32:39 pm
 * @copyright (c) 2019 CTO.ai
 *
 * DESCRIPTION
 *
 */

import { ux, sdk } from '@cto.ai/sdk'
import * as fs from 'fs-extra'
import * as json from 'JSONStream'
import * as path from 'path'
import * as through from 'through2'
import * as yaml from 'yaml'
import Docker from 'dockerode'
import { v4 as uuid } from 'uuid'

import { spawn, SpawnOptions } from 'child_process'

import Command, { flags } from '~/base'
import {
  HOME,
  OPS_API_HOST,
  OPS_API_PATH,
  OPS_REGISTRY_HOST,
} from '~/constants/env'
import {
  Op,
  RegistryAuth,
  Config,
  Container,
  RunPipeline,
  Workflow,
  RunCommandArgs,
  ChildProcessError,
  Question,
} from '~/types'
import {
  CouldNotGetRegistryToken,
  MissingRequiredArgument,
  CouldNotMakeDir,
  NoStepsFound,
} from '~/errors/customErrors'
import { OP_FILE } from '~/constants/opConfig'
import { onExit, asyncPipe, getOpImageTag, getOpUrl } from '~/utils'
import { WorkflowPipelineError } from '~/types/ChildProcessError'
import getDocker from '~/utils/get-docker'

export default class Run extends Command {
  static description = 'Run an op from the registry.'

  static flags = {
    help: flags.boolean({
      char: 'h',
      description: 'show CLI help',
    }),
    build: flags.boolean({
      char: 'b',
      description:
        'Builds the op before running. Must provide a path to the op.',
      default: false,
    }),
  }

  // Used to specify variable length arguments
  static strict = false

  static args = [
    {
      name: 'nameOrPath',
      description: 'Name or path of the op you want to run.',
    },
  ]

  docker: Docker | undefined
  container: Docker.Container | undefined = undefined

  prompts: Container<Question> = {
    agreeToMountHome: {
      type: 'confirm',
      name: 'agreeToMountHome',
      message:
        'Note: This container will mount your home directory as a read-only file system. Continue?',
    },
    ignoreMountWarnings: {
      type: 'confirm',
      name: 'ignoreMountWarnings',
      message: 'Would you like to skip this confirmation step from now on?',
    },
  }

  useCustomParser = (options: typeof Run, argv: string[]) => {
    const { args, flags } = require('@oclif/parser').parse(argv, {
      ...options,
      context: this,
    })
    if (!args.nameOrPath && !flags.help) {
      throw new MissingRequiredArgument('ops run')
    }
    if (!args.nameOrPath) this._help()

    return { args, flags, opParams: argv.slice(1) }
  }

  getOpFromFs = async (manifestPath: string, { team }: Config) => {
    const manifestYML = await fs.readFile(manifestPath, 'utf8')
    const { ops }: { ops: Op[] } = yaml.parse(manifestYML)
    let op: Op
    if (ops.length > 1) {
      const answers = await ux.prompt<{ op: Op }>({
        type: 'list',
        name: 'op',
        message: `\n Which ops would you like to build ${ux.colors.reset.green(
          '→',
        )}`,
        choices: ops.map(op => {
          return {
            value: op,
            name: `${op.name} - ${op.description}`,
          }
        }),
      })
      op = answers.op
    } else {
      op = ops[0]
    }
    // This allows any flags aside from -h to be passed into the op's run command

    const image = path.join(OPS_REGISTRY_HOST, `${team.name}/${op.name}`)

    return { op: { ...op, image }, isPublished: false }
  }

  getOpFromAPI = async (opNameOrPath: string, config: Config) => {
    const [opName] = opNameOrPath.split(':')
    const headers = {
      Authorization: config.accessToken,
    }
    const query = {
      team_id: config.team.id,
      search: opName,
    }

    try {
      const { data } = await this.api.find('ops', {
        query,
        headers,
      })
      if (data && !data.length) {
        throw new Error(
          '‼️  No op was found with this name or ID. Please try again.',
        )
      }
      let op: Op
      if (data.length > 1) {
        const { runOp } = await ux.prompt<{ runOp: Op }>({
          type: 'list',
          name: 'runOp',
          pageSize: 5,
          message: `\nSelect a ${this.ux.colors.multiBlue(
            '\u2749',
          )} public ${this.ux.colors.errorRed(
            '\u2749',
          )} team op to run ${this.ux.colors.reset.green('→')}`,
          choices: this.publicAndPrivateOpList(data),
          bottomContent: `\n \n${this.ux.colors.white(
            `Or, run ${this.ux.colors.callOutCyan(
              'ops help',
            )} for usage information.`,
          )}`,
        })
        op = runOp
      } else {
        op = data[0]
      }
      op.isPublic = this.team.id !== op.teamID
      return { op, isPublished: true }
    } catch (err) {
      this.debug('%O', err)
      throw new Error(err)
    }
  }

  publicAndPrivateOpList = (ops: Op[]) => {
    return ops.map(op => {
      let opName = this.ux.colors.reset.white(op.name)
      if (this.team.id === op.teamID) {
        opName = `${this.ux.colors.reset(
          this.ux.colors.errorRed('\u2749'),
        )} ${opName}`
      } else {
        opName = `${this.ux.colors.reset(
          this.ux.colors.multiBlue('\u2749'),
        )} ${opName} `
      }

      return {
        name: `${opName} - ${op.description}`,
        value: op,
      }
    })
  }

  printCustomHelp = (op: Op) => {
    if (!op.help)
      throw new Error('Custom help message can be defined in the ops.yml\n')

    switch (true) {
      case !!op.description:
        this.log(`\n${op.description}`)
      case !!op.help.usage:
        this.log(`\n${ux.colors.bold('USAGE')}`)
        this.log(`  ${op.help.usage}`)
      case !!op.help.arguments:
        this.log(`\n${ux.colors.bold('ARGUMENTS')}`)
        Object.keys(op.help.arguments).forEach(a => {
          this.log(`  ${a} ${ux.colors.dim(op.help.arguments[a])}`)
        })
      case !!op.help.options:
        this.log(`\n${ux.colors.bold('OPTIONS')}`)
        Object.keys(op.help.options).forEach(o => {
          this.log(
            `  -${o.substring(0, 1)}, --${o} ${ux.colors.dim(
              op.help.options[o],
            )}`,
          )
        })
    }
  }

  getOpConfig = async ({ parsedArgs, config, ...rest }: RunPipeline) => {
    const {
      args: { nameOrPath },
      opParams,
      flags: { help },
    } = parsedArgs
    const dirPath = path.resolve(process.cwd(), `${nameOrPath}`)
    const manifestPath = path.join(dirPath, OP_FILE)
    const { op, isPublished } = fs.existsSync(manifestPath)
      ? await this.getOpFromFs(manifestPath, config)
      : await this.getOpFromAPI(nameOrPath, config)

    if (!op || !op.name) throw new Error('Unable to find Op')
    op.run = [op.run, ...opParams].join(' ')
    if (help) {
      this.printCustomHelp(op)
      process.exit()
    }
    return { ...rest, op, isPublished, parsedArgs, config }
  }

  imageFilterPredicate = (repo: string) => ({ RepoTags }: Docker.ImageInfo) => {
    if (!RepoTags) return
    return RepoTags.find((repoTag: string) => repoTag.includes(repo))
  }

  findLocalImage = async ({ id, name }: Op, { team }: Config) => {
    if (!this.docker) throw new Error('No docker container')

    const list: Docker.ImageInfo[] = await this.docker.listImages()
    const repo = `${OPS_REGISTRY_HOST}/${team.name}/${id || name}:latest`

    const localImage = list
      .map(this.imageFilterPredicate(repo))
      .find((repoTag: string) => !!repoTag)

    return localImage
  }

  buildImage = async (op: Op, nameOrPath: string) => {
    const opPath = path.resolve(process.cwd(), nameOrPath)
    const tag = `${op.image}:latest`
    await this.config.runHook('build', { tag, opPath, op })
  }

  getAuthConfig = async (accessToken: string, teamName: string) => {
    const registryAuth: RegistryAuth | undefined = await this.getRegistryAuth(
      accessToken,
      teamName,
    )
    if (!registryAuth || !registryAuth.authconfig) {
      throw new CouldNotGetRegistryToken()
    }
    return registryAuth
  }

  updateStatusBar = (stream: NodeJS.ReadWriteStream, { parser, bar }) => async (
    resolve: (data: any) => void,
    reject: (err: Error) => void,
  ) => {
    const allData: any[] = []
    const size = 100

    stream
      .pipe(json.parse())
      .pipe(parser)
      .on('data', data => allData.push(data))
      .on('end', async (err: Error) => {
        for (let i = 0; i < size; i++) {
          bar.update(100 - size / i)
          await ux.wait(5)
        }
        bar.update(100)
        bar.stop()
        this.debug('%O', err)
        return err ? reject(err) : resolve(allData)
      })
  }

  getProgressBarText = (status: string, { name }: Op) => {
    const mapping = {
      [`Pulling from ${name}`]: `✅ Pulling from ${name}...`,
      'Already exists': '✅ Already exists!',
      Waiting: '⏱  Waiting...',
      Downloading: '👇 Downloading...',
      'Download complete': '👇 Downloaded!',
      Extracting: '📦 Unpacking...',
      'Pulling fs layer': '🐑 Pulling layers...',
      'Pull complete': '🎉 Pull Complete!',
    }
    return { speed: mapping[status] }
  }

  setParser = (
    op: Op,
    getFn: (status: string, op: Op) => { speed: string },
  ) => {
    const bar = ux.progress.init({
      format: ux.colors.callOutCyan('{bar} {percentage}% | Status: {speed} '),
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
    })
    bar.start(100, 0, { speed: '🏁 Starting...' })

    const layers = {}

    const parser = through.obj((chunk, _enc, callback) => {
      const { id, status, progressDetail: p } = chunk
      const progress = p && p.current ? (p.current / p.total) * 100 : 0
      const { speed } = getFn(status, op)

      if (id) layers[id] = id
      if (speed) bar.update(progress, { speed })

      callback()
    })

    const _pipe = parser.pipe
    parser.pipe = dest => _pipe(dest)
    return { parser, bar }
  }

  pullImageFromRegistry = async (op: Op, isPublished: boolean) => {
    this.log(`🔋 Pulling ${ux.colors.dim(op.name)} from registry...\n`)
    const { config } = this.state
    if (!this.docker) throw new Error('No docker')

    try {
      const opUrl = this.setOpUrl(op, config, isPublished)
      const teamName = op.isPublic ? 'ops' : this.team.name
      const { authconfig } = await this.getAuthConfig(
        config.accessToken,
        teamName,
      )
      const stream = await this.docker.pull(opUrl, { authconfig })

      if (!stream) throw new Error('No stream')

      const parser = await this.setParser(op, this.getProgressBarText)
      await new Promise(this.updateStatusBar(stream, parser))

      ux.spinner.stop(ux.colors.green('Done!'))
      const msg = `${ux.colors.italic.bold(`${op.name}:${op.id}`)}`
      this.log(`\n🙌 Saved ${msg} locally! \n`)

      return opUrl
    } catch (err) {
      this.debug('%O', err)
      throw new Error(err)
    }
  }

  getImage = async ({ op, config, parsedArgs, isPublished }: RunPipeline) => {
    try {
      const {
        args: { nameOrPath },
        flags: { build },
      } = parsedArgs
      const localImage = await this.findLocalImage(op, config)
      if (!localImage || build) {
        const opUrl = isPublished
          ? await this.pullImageFromRegistry(op, isPublished)
          : await this.buildImage(op, nameOrPath)
        return { op: { ...op, image: opUrl }, config }
      }
      return { op: { ...op, image: localImage }, config }
    } catch (err) {
      this.debug('%O', err)
      throw new Error('Unable to find image for this op')
    }
  }

  convertEnvStringsToObject = (acc: Container<string>, curr: string) => {
    const [key, val] = curr.split('=')
    if (!val) {
      return { ...acc }
    }
    return { ...acc, [key]: val }
  }

  overrideEnvWithProcessEnv = (processEnv: Container<string | undefined>) => ([
    key,
    val,
  ]: [string, string]) => [key, processEnv[key] || val]

  concatenateKeyValToString = ([key, val]: [string, string]) => `${key}=${val}`

  setEnvs = (processEnv: Container<string | undefined>) => ({
    op,
    config,
    ...rest
  }: RunPipeline) => {
    const defaultEnv: Container<string> = {
      OPS_HOME: path.resolve(sdk.homeDir() + '/.config/@cto.ai/ops'),
      CONFIG_DIR: `/${config.team.name}/${op.name}`,
      STATE_DIR: `/${config.team.name}/${op.name}/${op.runId}`,
      NODE_ENV: 'production',
      LOGGER_PLUGINS_STDOUT_ENABLED: 'true',
      RUN_ID: op.runId,
      OPS_ACCESS_TOKEN: config.accessToken,
      OPS_API_PATH,
      OPS_API_HOST,
      OPS_OP_ID: op.id,
      OPS_OP_NAME: op.name,
      OPS_TEAM_ID: config.team.id,
      OPS_TEAM_NAME: config.team.name,
      OPS_HOST_PLATFORM: this.config.platform,
    }

    let opsHome =
      (process.env.HOME || process.env.USERPROFILE) + '/.config/@cto.ai/ops'
    op.opsHome = opsHome === undefined ? '' : opsHome
    op.stateDir = `/${config.team.name}/${op.name}/${op.runId}`
    op.configDir = `/${config.team.name}/${op.name}`

    const opsYamlEnv: Container<string> = op.env
      ? op.env.reduce(this.convertEnvStringsToObject, {})
      : []

    const env = Object.entries({ ...defaultEnv, ...opsYamlEnv })
      .map(this.overrideEnvWithProcessEnv(processEnv))
      .map(this.concatenateKeyValToString)

    return { ...rest, config, op: { ...op, env } }
  }

  replaceHomeAlias = (bindPair: string) => {
    const [first, ...rest] = bindPair.split(':')
    const from = first.replace('~', HOME).replace('$HOME', HOME)
    const to = rest.join('')

    return `${from}:${to}`
  }

  hostSetup = ({ op, ...rest }: RunPipeline) => {
    if (!fs.existsSync(op.stateDir)) {
      try {
        fs.ensureDirSync(path.resolve(op.opsHome + op.stateDir))
      } catch (err) {
        this.debug('%O', err)
        throw new CouldNotMakeDir()
      }
    }

    return {
      ...rest,

      op: {
        ...op,
        bind: op.bind ? op.bind.map(this.replaceHomeAlias) : [],
      },
    }
  }

  setBinds = ({ op, ...rest }: RunPipeline) => {
    return {
      ...rest,
      op: {
        ...op,
        bind: op.bind ? op.bind.map(this.replaceHomeAlias) : [],
      },
    }
  }

  setOpUrl = (op: Op, { team }: Config, isPublished: boolean) => {
    const opIdentifier = isPublished ? op.id : op.name
    const projectIdentifier = op.isPublic ? 'ops' : team.name
    const opImageTag = getOpImageTag(projectIdentifier, opIdentifier)
    return getOpUrl(OPS_REGISTRY_HOST, opImageTag)
  }

  getOptions = ({ op, config, isPublished, ...rest }: RunPipeline) => {
    const Image = op.image || this.setOpUrl(op, config, isPublished)
    const WorkingDir = op.mountCwd ? '/cwd' : '/ops'
    const Cmd = op.run ? op.run.split(' ') : []

    if (op.mountCwd) {
      const bindFrom = process.cwd()
      const bindTo = '/cwd'
      const cwDir = `${bindFrom}:${bindTo}`
      op.bind.push(cwDir)
    }

    if (op.mountHome) {
      const homeDir = `${HOME}:/root:rw`
      op.bind.push(homeDir)
    }

    const stateMount =
      op.opsHome +
      op.configDir +
      ':/root/.config/@cto.ai/ops' +
      op.configDir +
      ':rw'

    op.bind.push(stateMount)

    const options = {
      // name: `${config.team.name}-${op.name}`,
      AttachStderr: true,
      AttachStdin: true,
      AttachStdout: true,
      Cmd,
      Env: op.env,
      WorkingDir,
      HostConfig: {
        Binds: op.bind,
        NetworkMode: op.network,
      },
      Image,
      OpenStdin: true,
      StdinOnce: false,
      Tty: true,
      Volumes: {},
      VolumesFrom: [],
    }

    return { ...rest, op, options }
  }

  createDockerContainer = async ({ op, options, ...rest }: RunPipeline) => {
    if (!this.docker) throw new Error('No docker')
    this.log(`⚙️  Running ${ux.colors.dim(op.name)}...`)

    try {
      const container = await this.docker.createContainer(options)
      this.container = container
      return { ...rest, op, options }
    } catch (err) {
      this.debug('%O', err)
      throw new Error('Error creating Docker container')
    }
  }

  attachToContainer = async (state: RunPipeline) => {
    if (!this.container) throw new Error('No docker container for attachment')

    try {
      const options = {
        stream: true,
        stdin: true,
        stdout: true,
        stderr: true,
      }

      const stream = await this.container.attach(options)

      this.handleStream(stream)
      await this.startDockerContainer(stream)

      return state
    } catch (err) {
      this.debug('%O', err)
      throw new Error(err)
    }
  }

  resize = () => {
    if (!this.container) throw new Error('No docker container for resize')

    try {
      const dimensions = {
        h: process.stdout.rows,
        w: process.stderr.columns,
      }
      if (dimensions.h !== 0 && dimensions.w !== 0) {
        this.container.resize(dimensions, () => {})
      }
    } catch (err) {
      this.debug('%O', err)
      throw new Error(err)
    }
  }

  handleExit = (stream: NodeJS.ReadWriteStream, isRaw: boolean) => {
    if (!this.container) throw new Error('No docker container for removal')

    const stdout = process.stdout
    const stdin = process.stdin

    try {
      stdout.removeListener('resize', this.resize)
      stdin.removeAllListeners()
      stdin.setRawMode && stdin.setRawMode(isRaw)
      stdin.resume()
      stream.end()
      this.container.remove(() => process.exit())
    } catch (err) {
      this.debug('%O', err)
      throw new Error(err)
    }
  }

  handleStream = (stream: NodeJS.ReadWriteStream) => {
    const CTRL_P = '\u0010'
    const CTRL_Q = '\u0011'
    let previousKey = ''

    stream.pipe(process.stdout)
    const stdin = process.stdin
    stdin.resume()
    stdin.setEncoding('utf8')
    stdin.setRawMode && stdin.setRawMode(true)
    stdin.pipe(stream)

    stdin.on('data', (key: string) => {
      // Detects it is detaching a running container
      if (previousKey === CTRL_P && key === CTRL_Q)
        this.handleExit(stream, false)
      previousKey = key
    })
  }

  startDockerContainer = async (stream: NodeJS.ReadWriteStream) => {
    if (!this.container) throw new Error('No docker container to start up')

    try {
      await this.container.start()
      this.resize()
      process.stdout.on('resize', this.resize)

      await this.container.wait()
      this.handleExit(stream, false)
    } catch (err) {
      this.debug('%O', err)
      throw new Error(err)
    }
  }

  sendAnalytics = ({ op }: RunPipeline) => {
    this.analytics.track({
      userId: this.user.email,
      event: 'Ops CLI Run',
      properties: {
        email: this.user.email,
        username: this.user.username,
        name: op.name,
        description: op.description,
        image: op.name,
      },
    })
  }

  _promptForHomeDirectory = async (
    mountHome: boolean,
    { ignoreMountWarnings }: Config,
  ): Promise<{ agreeToMountHome: boolean | undefined }> => {
    if (mountHome && !ignoreMountWarnings) {
      return this.ux.prompt<{ agreeToMountHome: boolean }>(
        this.prompts.agreeToMountHome,
      )
    }
    return { agreeToMountHome: ignoreMountWarnings }
  }

  _promptToIgnoreWarning = async (
    mountHome: boolean,
    { ignoreMountWarnings }: Config,
  ): Promise<{ ignoreMountWarnings: boolean | undefined }> => {
    /*
     * Prompt user only if ignore flag is undefined. If it is set to true or false,
     * the user has made up their mind. They should be asked this question only
     * once, not every time they run. *
     */
    if (mountHome && typeof ignoreMountWarnings === 'undefined') {
      return this.ux.prompt<{ ignoreMountWarnings: boolean }>(
        this.prompts.ignoreMountWarnings,
      )
    }
    return { ignoreMountWarnings }
  }

  _doBindMountChecks = async (mountHome: boolean, config: Config) => {
    if (!mountHome || config.ignoreMountWarnings) {
      return
    }
    const { agreeToMountHome } = await this._promptForHomeDirectory(
      mountHome,
      config,
    )

    // TO-DO: replace with link to actual docs
    if (!agreeToMountHome) {
      this.log(
        "\nAborting op execution. If you'd like to read more about our bind-mounting feature, please visit our docs: https://cto.ai/blog/\n",
      )
      process.exit()
    }

    const { ignoreMountWarnings } = await this._promptToIgnoreWarning(
      mountHome,
      config,
    )
    const isIgnoreFlagUndefined =
      typeof config.ignoreMountWarnings === 'undefined'

    if (isIgnoreFlagUndefined) {
      this.writeConfig(config, {
        ignoreMountWarnings,
      })
    }
  }

  async findWorkflow(manifestPath: string, nameOrPath: string) {
    const manifest = await fs.readFile(manifestPath, 'utf8')
    const { workflows }: { workflows: Workflow[] } = yaml.parse(manifest)
    if (!workflows) return
    return workflows.find(({ name }) => name === nameOrPath)
  }

  printMessage(bold: string, normal: string = '') {
    this.log(`\n ${this.ux.colors.bold(bold)} ${normal}\n`)
  }

  printErrorMessage({ code, signal }: ChildProcessError) {
    this.log(
      this.ux.colors.redBright(
        `Exit with error code ${this.ux.colors.whiteBright(
          code.toString(),
        )} and signal ${this.ux.colors.whiteBright(signal)}`,
      ),
    )
  }

  _runWorkflow = (options: SpawnOptions) => this._runWorkflowHof(options)

  _runWorkflowHof = (options: SpawnOptions) => (runCommand: string) => async ({
    errors,
    args,
  }: {
    errors: WorkflowPipelineError[]
    args: string[]
  }) => {
    this.printMessage(`🏃  Running ${runCommand}`)

    const childProcess = spawn(runCommand, [], options)

    const exitResponse: void | ChildProcessError = await onExit(childProcess)

    if (exitResponse) {
      this.printErrorMessage(exitResponse)
    }

    const newErrors = exitResponse
      ? [...errors, { exitResponse, runCommand }]
      : [...errors]
    return { errors: newErrors, args }
  }

  convertCommandToSpawnFunction = (options: SpawnOptions) => (
    runCommand: string,
  ): Function => this._runWorkflow(options)(runCommand)

  async runWorkflow(
    workflow: Workflow,
    parsedArgs: RunCommandArgs,
    config: Config,
  ) {
    const { name, steps } = workflow

    //TODO: both local & container ops should set the same envs in the same place
    process.env.OPS_OP_NAME = workflow.name
    process.env.OPS_TEAM_NAME = config.team.name
    process.env.STATE_DIR = workflow.stateDir
    process.env.CONFIG_DIR = workflow.configDir
    process.env.RUN_ID = workflow.runId
    //TODO: both local & container ops should set the same envs in the same place

    process.env.OPS_ACCESS_TOKEN = config.accessToken
    const options: SpawnOptions = {
      stdio: 'inherit',
      shell: true,
      env: process.env,
    }

    const workflowCommands = steps.map(
      this.convertCommandToSpawnFunction(options),
    )

    const errors: WorkflowPipelineError[] = []
    const workflowPipeline = asyncPipe(...workflowCommands)

    const finalOutput: {
      errors: WorkflowPipelineError[]
      args: string[]
    } = await workflowPipeline({
      errors,
      args: parsedArgs.opParams,
    })
    const { errors: finalErrors } = finalOutput
    if (finalErrors.length) {
      this.log(`\n❗️  Workflow ${this.ux.colors.callOutCyan(name)} failed.`)
      finalErrors.forEach((error: WorkflowPipelineError, i: number) => {
        this.log(
          this.ux.colors.redBright(
            `🤔  There was a problem with the ${this.ux.colors.whiteBright(
              error.runCommand,
            )}.\n`,
          ),
        )
      })
    }
    !finalErrors.length &&
      this.printMessage(
        `😌  Workflow ${this.ux.colors.callOutCyan(
          name,
        )} completed successfully.`,
      )
  }

  async getWorkflowIfExists(
    config: Config,
    { args: { nameOrPath } }: RunCommandArgs,
  ) {
    const localManifest = path.join(process.cwd(), OP_FILE)
    const localManifestExists = fs.existsSync(localManifest)

    if (!localManifestExists) {
      return null
    }

    const runId: string = uuid()

    const workflow: Workflow | undefined = await this.findWorkflow(
      localManifest,
      nameOrPath,
    )

    if (workflow) {
      workflow.runId = runId
      const opsHome = `${process.env.HOME ||
        process.env.USERPROFILE}/.config/@cto.ai/ops`
      workflow.opsHome = opsHome === undefined ? '' : opsHome
      workflow.stateDir = `/${config.team.name}/${workflow.name}/${runId}`
      workflow.configDir = `/${config.team.name}/${workflow.name}`

      if (!fs.existsSync(workflow.stateDir)) {
        try {
          fs.ensureDirSync(path.resolve(workflow.opsHome + workflow.stateDir))
        } catch (err) {
          this.debug('%O', err)
          throw new CouldNotMakeDir()
        }
      }
    }

    return workflow
  }

  setRunID = ({ op, ...rest }: RunPipeline) => {
    const runId: string = uuid()
    op.runId = runId

    return { op, ...rest }
  }

  interpolateRunCmd = (
    { steps, runId, name }: Pick<Workflow, 'steps' | 'runId' | 'name'>,
    teamName: string,
  ): string[] => {
    if (!steps.length) {
      throw new NoStepsFound()
    }
    return steps.map(step => {
      return step
        .replace(
          '{{OPS_STATE_DIR}}',
          path.resolve(`/${teamName}/${name}/${runId}`),
        )
        .replace('{{OPS_CONFIG_DIR}}', path.resolve(`/${teamName}/${name}`))
    })
  }

  async run() {
    try {
      this.isLoggedIn()
      const { config } = this.state
      process.env.OPS_HOST_PLATFORM = this.config.platform

      const parsedArgs: RunPipeline['parsedArgs'] = this.useCustomParser(
        Run,
        this.argv,
      )

      const workflow = await this.getWorkflowIfExists(config, parsedArgs)

      if (workflow) {
        const interpolatedWorkflow = {
          ...workflow,
          steps: this.interpolateRunCmd(workflow, config.team.name),
        }
        return await this.runWorkflow(interpolatedWorkflow, parsedArgs, config)
      }

      this.docker = await getDocker(this, 'run')

      const runPipeline = asyncPipe(
        this.getOpConfig,
        this.setRunID,
        this.getImage,
        this.setEnvs(process.env),
        this.hostSetup,
        this.setBinds,
        this.getOptions,
        this.createDockerContainer,
        this.sendAnalytics,
        this.attachToContainer,
      )

      await runPipeline({
        parsedArgs,
        config,
        isPublished: false,
        options: undefined,
      })
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err })
    }
  }
}
