/**
 * @author: Brett Campbell (brett@hackcapital.com)
 * @date: Saturday, 6th April 2019 10:39:58 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Friday, 17th May 2019 6:29:20 pm
 * @copyright (c) 2019 CTO.ai
 *
 * DESCRIPTION
 *
 */

import { ux } from '@cto.ai/sdk'
import * as fs from 'fs-extra'
import * as json from 'JSONStream'
import * as path from 'path'
import * as through from 'through2'
import _ from 'underscore'
import * as yaml from 'yaml'
import Docker from 'dockerode'

import { spawn, SpawnOptions } from 'child_process'
import { Question } from 'inquirer'

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
  LocalOp,
  RunCommandArgs,
  ChildProcessError,
} from '~/types'
import {
  CouldNotGetRegistryToken,
  MissingRequiredArgument,
} from '~/errors/customErrors'
import { OP_FILE } from '~/constants/opConfig'
import { onExit, asyncPipe, getOpImageTag, getOpUrl } from '~/utils'
import { LocalOpPipelineError } from '~/types/ChildProcessError'
import getDocker from '~/utils/get-docker'

type LocalHook = 'main command' | 'before-hook' | 'after-hook'

export interface CommandInfo {
  hookType: LocalHook
  command: string
}

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

  getOpFromFs = async (
    manifestPath: string,
    opParams: string[],
    { team }: Config,
  ) => {
    const manifestYML = await fs.readFile(manifestPath, 'utf8')
    const manifestObj: Op = yaml.parse(manifestYML)

    // This allows any flags aside from -h to be passed into the op's run command

    const image = path.join(
      OPS_REGISTRY_HOST,
      `${team.name}/${manifestObj.name}`,
    )

    return { op: { ...manifestObj, image }, isPublished: false }
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
      let op
      if (data.length > 1) {
        const answer = await ux.prompt({
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
        op = answer.runOp
      } else {
        op = data[0]
      }
      return { op, isPublished: true }
    } catch (err) {
      this.debug(err)
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
        op.isPublic = true
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
      ? await this.getOpFromFs(manifestPath, opParams, config)
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
        this.debug(err)
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
      this.debug(err)
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
      this.debug(err)
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
      NODE_ENV: 'production',
      LOGGER_PLUGINS_STDOUT_ENABLED: 'true',
      OPS_ACCESS_TOKEN: config.accessToken,
      OPS_API_PATH,
      OPS_API_HOST,
      OPS_OP_ID: op.id,
      OPS_TEAM_ID: config.team.id,
    }

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
      const homeDir = `${HOME}:/root:ro`
      op.bind.push(homeDir)
    }

    const options = {
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
      this.debug(err)
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
      this.debug(err)
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
      this.debug(err)
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
      this.debug(err)
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
      this.debug(err)
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
        image: `${op.image}`,
      },
    })
  }

  _promptForHomeDirectory = async (
    mountHome: boolean,
    { ignoreMountWarnings }: Config,
  ) => {
    if (mountHome && !ignoreMountWarnings) {
      return this.ux.prompt(this.prompts.agreeToMountHome)
    }
    return { agreeToMountHome: ignoreMountWarnings }
  }

  _promptToIgnoreWarning = async (
    mountHome: boolean,
    { ignoreMountWarnings }: Config,
  ) => {
    /*
     * Prompt user only if ignore flag is undefined. If it is set to true or false,
     * the user has made up their mind. They should be asked this question only
     * once, not every time they run. *
     */
    if (mountHome && typeof ignoreMountWarnings === 'undefined') {
      return this.ux.prompt(this.prompts.ignoreMountWarnings)
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

  async findLocalOp(manifestPath: string, nameOrPath: string) {
    const manifest = await fs.readFile(manifestPath, 'utf8')
    const { ops }: { ops: LocalOp[] } = yaml.parse(manifest)
    if (!ops) return
    return ops.find(({ name }) => name === nameOrPath)
  }

  printMessage(bold: string, normal: string = '') {
    this.log(`\n ${this.ux.colors.bold(bold)} ${normal}\n`)
  }

  printErrorMessage({ code, signal }: ChildProcessError) {
    this.log(
      this.ux.colors.redBright(
        `Exit with error code ${this.ux.colors.whiteBright(
          code,
        )} and signal ${this.ux.colors.whiteBright(signal)}`,
      ),
    )
  }

  _runLocalOp = (options: SpawnOptions) => this._runLocalOpHof(options)

  _runLocalOpHof = (options: SpawnOptions) => (
    commandInfo: CommandInfo,
  ) => async ({
    errors,
    args,
  }: {
    errors: LocalOpPipelineError[]
    args: string[]
  }) => {
    const { hookType, command } = commandInfo

    this.printMessage(`🏃  Running ${hookType}:`, command)

    const params = args && hookType === 'main command' ? args : []
    const childProcess = spawn(command, params, options)

    const exitResponse: void | ChildProcessError = await onExit(childProcess)

    if (exitResponse) {
      this.printErrorMessage(exitResponse)
    }

    const newErrors = exitResponse
      ? [...errors, { exitResponse, commandInfo }]
      : [...errors]
    return { errors: newErrors, args }
  }

  labelTheCommand = (hookType: LocalHook) => (
    command: string,
  ): CommandInfo => ({
    hookType,
    command,
  })

  createArrayOfAllLocalCommands = (
    { before, run, after }: LocalOp,
    options: SpawnOptions,
  ) => {
    const beforeCommands = before
      ? before.map(this.labelTheCommand('before-hook'))
      : []
    const runCommand = [run].map(this.labelTheCommand('main command'))
    const afterCommands = after
      ? after.map(this.labelTheCommand('after-hook'))
      : []
    const flattenedCommands = [
      ...beforeCommands,
      ...runCommand,
      ...afterCommands,
    ]
    return flattenedCommands.map(this.convertCommandToSpawnFunction(options))
  }

  convertCommandToSpawnFunction = (options: SpawnOptions) => (
    commandInfo: CommandInfo,
  ): Function => this._runLocalOp(options)(commandInfo)

  async runLocalOps(localOp: LocalOp, parsedArgs: RunCommandArgs) {
    const { name } = localOp
    const options: SpawnOptions = {
      stdio: 'inherit',
      shell: true,
      env: process.env,
    }

    const localOps = this.createArrayOfAllLocalCommands(localOp, options)

    const errors: LocalOpPipelineError[] = []

    const localOpPipeline = asyncPipe(...localOps)

    const finalOutput: {
      errors: LocalOpPipelineError[]
      args: string[]
    } = await localOpPipeline({
      errors,
      args: parsedArgs.opParams,
    })

    const { errors: finalErrors } = finalOutput

    finalErrors.forEach((error: LocalOpPipelineError, i: number) => {
      if (i === 0) {
        this.log(`\n❗️  Local op ${this.ux.colors.callOutCyan(name)} failed.`)
        this.log(
          this.ux.colors.redBright(
            `🤔  There was a problem with the ${this.ux.colors.whiteBright(
              error.commandInfo.command,
            )} command in the ${this.ux.colors.whiteBright(
              error.commandInfo.hookType,
            )}.\n`,
          ),
        )
        // additional error logging, probably not necessary
        // if (error.exitResponse) {
        //   this.printErrorMessage(error.exitResponse)
        // }
      }
    })

    !finalErrors.length &&
      this.printMessage(
        `😌  Local op ${this.ux.colors.callOutCyan(
          name,
        )} completed successfully.`,
      )
  }

  async getLocalOpIfExists({ args: { nameOrPath } }: RunCommandArgs) {
    const localManifest = path.join(process.cwd(), OP_FILE)
    const localManifestExists = fs.existsSync(localManifest)

    if (!localManifestExists) {
      return null
    }

    const localOp: LocalOp | undefined = await this.findLocalOp(
      localManifest,
      nameOrPath,
    )
    // if (localOp && !localOp.run) {
    //   throw new Error('ops.yml must specify a run command')
    // }

    return localOp
  }

  async run() {
    try {
      this.isLoggedIn()
      const { config } = this.state
      const parsedArgs: RunPipeline['parsedArgs'] = this.useCustomParser(
        Run,
        this.argv,
      )

      const localOp = await this.getLocalOpIfExists(parsedArgs)
      if (localOp) {
        return await this.runLocalOps(localOp, parsedArgs)
      }

      this.docker = await getDocker(this, 'run')

      const runPipeline = asyncPipe(
        this.getOpConfig,
        this.getImage,
        this.setEnvs(process.env),
        this.setBinds,
        this.getOptions,
        this.createDockerContainer,
        this.attachToContainer,
        this.sendAnalytics,
      )

      await runPipeline({
        parsedArgs,
        config,
        isPublished: false,
        options: undefined,
      })
    } catch (err) {
      this.debug(err)
      this.config.runHook('error', { err })
    }
  }
}
