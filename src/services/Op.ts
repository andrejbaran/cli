import { sdk, ux } from '@cto.ai/sdk'
import Debug from 'debug'
import Docker, { ContainerCreateOptions, PortMap } from 'dockerode'
import * as fs from 'fs-extra'
import * as os from 'os'
import * as path from 'path'
import { v4 as uuid } from 'uuid'
import {
  HOME,
  OPS_API_HOST,
  OPS_API_PATH,
  OPS_REGISTRY_HOST,
  OPS_SEGMENT_KEY,
} from '~/constants/env'
import { SDK2, SDK2_DAEMON_ENTRYPOINT } from '../constants/opConfig'
import {
  CouldNotMakeDir,
  InvalidInputCharacter,
  InvalidOpVersionFormat,
  YamlPortError,
} from '~/errors/CustomErrors'
import { ErrorTemplate } from '~/errors/ErrorTemplate'
import { AnalyticsService } from '~/services/Analytics'
import { ContainerService } from '~/services/Container'
import { ImageService } from '~/services/Image'
import { RegistryAuthService } from '~/services/RegistryAuth'
import { Config, Container, OpCommand, RunCommandArgs } from '~/types'
import { asyncPipe, getOpImageTag, getOpUrl } from '~/utils'
import { isValidOpName, isValidOpVersion } from '~/utils/validate'
const util = require('util')
const exec = util.promisify(require('child_process').exec)

const debug = Debug('ops:OpService')

export interface OpRunInputs {
  op: OpCommand
  config: Config
  parsedArgs: RunCommandArgs
  options: ContainerCreateOptions
  container: Docker.Container
  version: string
}
export class OpService {
  constructor(
    protected registryAuthService = new RegistryAuthService(),
    protected imageService = new ImageService(),
    protected containerService = new ContainerService(),
    protected analytics = new AnalyticsService(OPS_SEGMENT_KEY),
  ) {}

  public opsBuildLoop = async (
    ops: OpCommand[],
    opPath: string,
    config: Config,
  ) => {
    const {
      team: { name: teamName },
      user,
      tokens: { accessToken },
    } = config
    for (const op of ops) {
      if (!('run' in op)) continue
      if (!isValidOpName(op.name)) {
        throw new InvalidInputCharacter('Op Name')
      }
      if (!isValidOpVersion(op)) {
        throw new InvalidOpVersionFormat()
      }
      console.log(
        `🛠  ${ux.colors.white('Building:')} ${ux.colors.callOutCyan(
          op.name + ':' + op.version,
        )}\n`,
      )
      const opImageTag = getOpImageTag(
        teamName,
        op.name,
        op.version,
        op.isPublic,
      )
      await this.imageService.build(
        getOpUrl(OPS_REGISTRY_HOST, opImageTag),
        opPath,
        op,
      )

      this.analytics.track(
        'Ops CLI Build',
        {
          username: user.username,
          team: teamName,
          name: op.name,
          version: op.version,
          description: op.description,
          namespace: `@${teamName}/${op.name}`,
          namespace_version: `@${teamName}/${op.name}:${op.version}`,
          image: `${OPS_REGISTRY_HOST}/${op.name}:${op.version}`,
        },
        config,
      )
    }
  }

  async run(
    op: OpCommand,
    parsedArgs: RunCommandArgs,
    config: Config,
    version: string,
  ): Promise<void> {
    try {
      const opServicePipeline = asyncPipe(
        this.updateOpFields,
        this.getImage,
        this.setEnvs,
        this.hostSetup,
        this.setBinds,
        this.getOptions,
        this.addPortsToOptions,
        this.createContainer,
        this.attachToContainer,
      )

      await opServicePipeline({
        op,
        config,
        parsedArgs,
        version,
      })
    } catch (err) {
      debug('%O', err)
      throw err
    }
  }

  updateOpFields = (inputs: OpRunInputs): OpRunInputs => {
    let {
      op,
      parsedArgs: { opParams },
    } = inputs
    if (op.sdk === SDK2) {
      op.run = `${SDK2_DAEMON_ENTRYPOINT} ${op.run}`
    }
    op.run = [op.run, ...opParams].join(' ')
    op.runId = uuid()
    return { ...inputs, op }
  }

  getImage = async (inputs: OpRunInputs) => {
    const {
      op,
      config,
      version,
      parsedArgs: {
        args: { nameOrPath },
        flags: { build },
      },
    } = inputs
    try {
      op.image = this.setOpImageUrl(op, config)
      const localImage = await this.imageService.checkLocalImage(op.image)
      if (!localImage || build) {
        op.isPublished
          ? await this.pullImageFromRegistry(op, config, version)
          : await this.imageService.build(
              `${op.image}`,
              path.resolve(process.cwd(), nameOrPath),
              op,
            )
      }
      return inputs
    } catch (err) {
      if (err instanceof ErrorTemplate) {
        throw err
      }
      debug('%O', err)
      throw new Error('Unable to find image for this op')
    }
  }
  pullImageFromRegistry = async (
    op: OpCommand,
    config: Config,
    version: string,
  ) => {
    const { authconfig } = await this.registryAuthService.create(
      config.tokens.accessToken,
      op.teamName,
      op.name,
      version,
      true,
      false,
    )
    // pull image
    await this.imageService.pull(op, authconfig)
  }

  setOpImageUrl = (op: OpCommand, config: Config) => {
    const opIdentifier = op.isPublished ? op.id : op.name
    const teamName = op.teamName ? op.teamName : config.team.name
    const opImageTag = getOpImageTag(
      teamName,
      opIdentifier,
      op.version,
      op.isPublic,
    )
    return getOpUrl(OPS_REGISTRY_HOST, opImageTag)
  }

  setEnvs = (inputs: OpRunInputs): OpRunInputs => {
    const { config, op, parsedArgs } = inputs
    const defaultEnv: Container<string> = {
      OPS_HOME: path.resolve(sdk.homeDir() + '/.config/@cto.ai/ops'),
      CONFIG_DIR: `/${config.team.name}/${op.name}`,
      STATE_DIR: `/${config.team.name}/${op.name}/${op.runId}`,
      NODE_ENV: 'production',
      LOGGER_PLUGINS_STDOUT_ENABLED: 'true',
      RUN_ID: op.runId,
      OPS_ACCESS_TOKEN: config.tokens.accessToken,
      OPS_API_PATH,
      OPS_API_HOST,
      OPS_OP_ID: op.id,
      OPS_OP_NAME: op.name,
      OPS_TEAM_ID: config.team.id,
      OPS_TEAM_NAME: config.team.name,
      OPS_HOST_PLATFORM: os.platform(),
    }

    if (parsedArgs.flags.batch) {
      defaultEnv.SDK_BATCH_MODE = '1'
    }

    let opsHome =
      (process.env.HOME || process.env.USERPROFILE) + '/.config/@cto.ai/ops'
    op.opsHome = opsHome === undefined ? '' : opsHome
    op.stateDir = `/${config.team.name}/${op.name}/${op.runId}`
    op.configDir = `/${config.team.name}/${op.name}`

    const opsYamlEnv: Container<string> = op.env
      ? op.env.reduce(this.convertEnvStringsToObject, {})
      : {}

    op.env = Object.entries({ ...defaultEnv, ...opsYamlEnv })
      .map(this.overrideEnvWithProcessEnv(process.env))
      .map(([key, val]: [string, string]) => `${key}=${val}`)

    return { ...inputs, config, op }
  }
  hostSetup = ({ op, ...rest }: OpRunInputs) => {
    if (!fs.existsSync(op.stateDir)) {
      try {
        fs.ensureDirSync(path.resolve(op.opsHome + op.stateDir))
      } catch (err) {
        debug('%O', err)
        throw new CouldNotMakeDir(err, path.resolve(op.opsHome + op.stateDir))
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

  setBinds = ({ op, ...rest }: OpRunInputs) => {
    return {
      ...rest,
      op: {
        ...op,
        bind: op.bind ? op.bind.map(this.replaceHomeAlias) : [],
      },
    }
  }

  getOptions = ({ op, config, ...rest }: OpRunInputs) => {
    const Image = op.image
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

  addPortsToOptions = async ({
    op,
    options,
    ...rest
  }: OpRunInputs): Promise<OpRunInputs> => {
    /**
     * Turns a string of ports to the syntax docker understands if it exists
     * https://docs.docker.com/engine/api/v1.39/#operation/ContainerCreate
     *
     * e.g.
     * ports:
     *   - 3000:3000
     *   - 5000:9000
     * Will turn to
     * PortBindings: {
     *  "3000/tcp": [
     *   {
     *     "HostPort": "3000"
     *   },
     *  "5000/tcp": [
     *   {
     *     "HostPort": "9000"
     *   }
     * ]
     * ExposedPorts: {
     *   "3000/tcp": {},
     *   "5000/tcp": {}
     * }
     */
    const ExposedPorts: { [key: string]: {} } = {}
    const PortBindings: PortMap = {}
    if (op.port) {
      const parsedPorts = op.port
        .filter(p => !!p) // Remove null values
        .map(port => {
          if (typeof port !== 'string') throw new YamlPortError(port)
          const portSplits = port.split(':')
          if (!portSplits.length || portSplits.length > 2) {
            throw new YamlPortError(port)
          }
          portSplits.forEach(p => {
            const portNumber = parseInt(p, 10)
            if (!portNumber) throw new YamlPortError(port)
          })
          return { host: portSplits[0], machine: `${portSplits[1]}/tcp` }
        })

      parsedPorts.forEach(parsedPorts => {
        ExposedPorts[parsedPorts.machine] = {}
      })

      parsedPorts.forEach(parsedPorts => {
        PortBindings[parsedPorts.machine] = [
          ...(PortBindings[parsedPorts.machine] || []),
          {
            HostPort: parsedPorts.host,
          },
        ]
      })
    }

    options = {
      ...options,
      ExposedPorts,
      HostConfig: {
        ...options.HostConfig,
        PortBindings,
      },
    }

    return {
      ...rest,
      op,
      options,
    }
  }

  createContainer = async (inputs: OpRunInputs): Promise<OpRunInputs> => {
    // TODO: This is a quick hack. We'll be able to do better when we
    // record daemon versions on publish.
    if (inputs.parsedArgs.flags.batch) {
      try {
        const { stdout: versionOutput } = await exec(
          `docker run --rm ${inputs.op.image} /bin/sdk-daemon --version`,
        )
        const versionComponents = versionOutput
          .split('.')
          .map((piece: string) => parseInt(piece))
        // support starts at daemon version 2.2.0
        if (versionComponents[0] < 2 || versionComponents[1] < 2) {
          throw 'temp'
        }
      } catch (err) {
        throw new Error(
          'Op does not support batch mode. Rebuild it with the latest CLI to add support.',
        )
      }
    }

    try {
      const { op, options } = inputs
      const container = await this.containerService.create(op, options)
      return { ...inputs, container }
    } catch (err) {
      debug('%O', err)
      throw new Error('Error creating Docker container')
    }
  }
  attachToContainer = async (inputs: OpRunInputs) => {
    const { container } = inputs
    if (!container) throw new Error('No docker container for attachment')

    try {
      const options = {
        stream: true,
        stdin: true,
        stdout: true,
        stderr: true,
      }

      const stream = await container.attach(options)

      this.containerService.handleStream(stream)
      await this.containerService.start(stream)

      return inputs
    } catch (err) {
      debug('%O', err)
      throw new Error(err)
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

  replaceHomeAlias = (bindPair: string) => {
    const [first, ...rest] = bindPair.split(':')
    const from = first.replace('~', HOME).replace('$HOME', HOME)
    const to = rest.join('')

    return `${from}:${to}`
  }
}
