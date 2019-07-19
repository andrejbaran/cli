import { sdk } from '@cto.ai/sdk'
import Debug from 'debug'
import Docker from 'dockerode'
import { v4 as uuid } from 'uuid'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as os from 'os'

import { Op, Config, Container } from '~/types'
import { asyncPipe, getOpImageTag, getOpUrl } from '~/utils'
import { RunCommandArgs } from '~/commands/run'
import { ImageService } from '~/services/Image'
import { ContainerService } from '~/services/Container'
import { RegistryAuthService } from '~/services/RegistryAuth'
import {
  HOME,
  OPS_REGISTRY_HOST,
  OPS_API_PATH,
  OPS_API_HOST,
} from '~/constants/env'
import { CouldNotMakeDir } from '~/errors/customErrors'
const debug = Debug('ops:OpService')

interface OpRunInputs {
  op: Op
  config: Config
  parsedArgs: RunCommandArgs
  options: object
  container: Docker.Container
}
export class OpService {
  constructor(
    protected registryAuthService = new RegistryAuthService(),
    protected imageService = new ImageService(),
    protected containerService = new ContainerService(),
  ) {}
  async run(op: Op, parsedArgs: RunCommandArgs, config: Config): Promise<void> {
    try {
      const opServicePipeline = asyncPipe(
        this.updateOpFields,
        this.getImage,
        this.setEnvs,
        this.hostSetup,
        this.setBinds,
        this.getOptions,
        this.createContainer,
        this.attachToContainer,
      )

      await opServicePipeline({
        op,
        config,
        parsedArgs,
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
    op.run = [op.run, ...opParams].join(' ')
    op.runId = uuid()
    return { ...inputs, op }
  }
  getImage = async (inputs: OpRunInputs) => {
    const {
      op,
      config,
      parsedArgs: {
        args: { nameOrPath },
        flags: { build },
      },
    } = inputs
    try {
      op.image = this.setOpImageUrl(op, config)
      const localImage = await this.imageService.checkLocalImage(
        op.image,
        config,
      )
      if (!localImage || build) {
        op.isPublished
          ? await this.pullImageFromRegistry(op, config)
          : await this.imageService.build(
              `${op.image}`,
              path.resolve(process.cwd(), nameOrPath),
              op,
            )
      }
      return inputs
    } catch (err) {
      debug('%O', err)
      throw new Error('Unable to find image for this op')
    }
  }
  pullImageFromRegistry = async (op: Op, config: Config) => {
    const teamName = op.isPublic ? 'ops' : config.team.name
    const { authconfig } = await this.registryAuthService.get(
      config.accessToken,
      teamName,
    )
    return this.imageService.pull(op, authconfig)
  }

  setOpImageUrl = (op: Op, { team }: Config) => {
    const opIdentifier = op.isPublished ? op.id : op.name
    const projectIdentifier = op.isPublic ? 'ops' : team.name
    const opImageTag = getOpImageTag(projectIdentifier, opIdentifier)
    return getOpUrl(OPS_REGISTRY_HOST, opImageTag)
  }

  setEnvs = (inputs: OpRunInputs): OpRunInputs => {
    const { config, op } = inputs
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
      OPS_HOST_PLATFORM: os.platform(),
    }

    let opsHome =
      (process.env.HOME || process.env.USERPROFILE) + '/.config/@cto.ai/ops'
    op.opsHome = opsHome === undefined ? '' : opsHome
    op.stateDir = `/${config.team.name}/${op.name}/${op.runId}`
    op.configDir = `/${config.team.name}/${op.name}`

    const opsYamlEnv: Container<string> = op.env
      ? op.env.reduce(this.convertEnvStringsToObject, {})
      : []

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

  createContainer = async (inputs: OpRunInputs): Promise<OpRunInputs> => {
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
