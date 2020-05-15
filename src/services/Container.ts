import { ux } from '@cto.ai/sdk'
import Docker from 'dockerode'
import Debug from 'debug'
import { OpCommand } from '~/types'
import getDocker from '~/utils/get-docker'
import detect from 'detect-port'
import {
  AllocatedYamlPortError,
  MissingYamlPortError,
  DuplicateYamlPortError,
} from '~/errors/CustomErrors'

const debug = Debug('ops:ContainerService')

export class ContainerService {
  log = console.log
  container

  getPorts = (portMap: string[]): [string[], string[]] => {
    let localPorts: string[] = []
    let dockerPorts: string[] = []

    for (const portPair of portMap) {
      let portSplit = portPair.split(':')
      if (portSplit[0] === '' && portSplit[1] === '') {
        throw new MissingYamlPortError()
      }
      localPorts.push(portSplit[0])
      dockerPorts.push(portSplit[1])
    }

    return [localPorts, dockerPorts]
  }

  hasDuplicates = (allPorts: string[]) => {
    return new Set(allPorts).size !== allPorts.length
  }

  checkLocalPorts = async (localPorts: string[]): Promise<string[]> => {
    let allocatedPorts: string[] = []

    for (const localPort of localPorts) {
      const port = await detect(localPort)
      if (localPort != port) {
        allocatedPorts.push(localPort)
      }
    }

    return allocatedPorts
  }

  validatePorts = async (portMap: string[]) => {
    if (portMap.length === 0 || portMap[0] === null) {
      throw new MissingYamlPortError()
    }

    const [localPorts, dockerPorts] = this.getPorts(portMap)

    if (this.hasDuplicates(localPorts)) {
      throw new DuplicateYamlPortError()
    }

    if (this.hasDuplicates(dockerPorts)) {
      throw new DuplicateYamlPortError()
    }

    const allocatedPorts = await this.checkLocalPorts(localPorts)

    if (allocatedPorts.length != 0) {
      throw new AllocatedYamlPortError(allocatedPorts.join(', '))
    }
  }

  create = async (
    op: OpCommand,
    options: Docker.ContainerCreateOptions,
  ): Promise<Docker.Container> => {
    const docker = await getDocker(console, 'ContainerService')
    this.log(`⚙️  Running ${ux.colors.dim(op.name)}...`)

    if (op.port) {
      try {
        await this.validatePorts(op.port)
      } catch (err) {
        // validatePorts throws a user-friendly error message
        this.log(err.message)
        debug('%O', err)
        throw new Error('Error creating Docker container')
      }
    }

    try {
      this.container = await docker.createContainer(options)
      return this.container
    } catch (err) {
      debug('%O', err)
      throw new Error('Error creating Docker container')
    }
  }

  /**
   * Starts and runs the current container.
   * NOTE: will `process.exit` when the container wraps up!
   */
  start = async (stream: NodeJS.ReadWriteStream) => {
    if (!this.container) throw new Error('No docker container to start up')

    try {
      await this.container.start()
      this.resize()
      process.stdout.on('resize', this.resize)

      const exitStatus = await this.container.wait()
      this.handleExit(stream, false, exitStatus)
    } catch (err) {
      debug('%O', err)
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
      if (previousKey === CTRL_P && key === CTRL_Q) {
        this.handleExit(stream, false, 0)
      }
      previousKey = key
    })
  }

  // NOTE: This function (indirectly) calls `process.exit`
  handleExit = (
    stream: NodeJS.ReadWriteStream,
    isRaw: boolean,
    exitStatus: number,
  ) => {
    if (!this.container) throw new Error('No docker container for removal')
    const stdout = process.stdout
    const stdin = process.stdin

    try {
      stdout.removeListener('resize', this.resize)
      stdin.removeAllListeners()
      stdin.setRawMode && stdin.setRawMode(isRaw)
      stdin.resume()
      stream.end()
      this.container.remove(() => process.exit(exitStatus))
    } catch (err) {
      debug('%O', err)
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
      debug('%O', err)
      throw new Error(err)
    }
  }
}
