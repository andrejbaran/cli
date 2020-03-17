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

    for (let i = 0; i < portMap.length; i++) {
      let portSplit = portMap[i].split(':')
      if (portSplit[0] !== '' && portSplit[1] !== '') {
        localPorts.push(portSplit[0])
        dockerPorts.push(portSplit[1])
      } else {
        const errorMessage = new MissingYamlPortError()
        this.log(errorMessage.message)
        throw errorMessage
      }
    }

    return [localPorts, dockerPorts]
  }

  hasDuplicates = (allPorts: string[]) => {
    return new Set(allPorts).size !== allPorts.length
  }

  checkLocalPorts = async (localPorts: string[]): Promise<string[]> => {
    let allocatedPorts: string[] = []

    for (let i = 0; i < localPorts.length; i++) {
      const port = await detect(localPorts[i])
      if (localPorts[i] != port) {
        allocatedPorts.push(localPorts[i])
      }
    }

    return allocatedPorts
  }

  validatePorts = async (portMap: string[]) => {
    if (!portMap || portMap[0] === null) {
      const errorMessage = new MissingYamlPortError()
      this.log(errorMessage.message)
      throw errorMessage
    }

    const [localPorts, dockerPorts] = await this.getPorts(portMap)

    if (this.hasDuplicates(localPorts)) {
      const errorMessage = new DuplicateYamlPortError()
      this.log(errorMessage.message)
      throw errorMessage
    }

    if (this.hasDuplicates(dockerPorts)) {
      const errorMessage = new DuplicateYamlPortError()
      this.log(errorMessage.message)
      throw errorMessage
    }

    const allocatedPorts = await this.checkLocalPorts(localPorts)

    if (allocatedPorts.length != 0) {
      const errorMessage = new AllocatedYamlPortError(allocatedPorts.join(', '))
      this.log(errorMessage.message)
      throw errorMessage
    }
  }

  create = async (
    op: OpCommand,
    options: Docker.ContainerCreateOptions,
  ): Promise<Docker.Container> => {
    const docker = await getDocker(console, 'ContainerService')
    this.log(`⚙️  Running ${ux.colors.dim(op.name)}...`)

    await this.validatePorts(op.port).catch(err => {
      debug('%O', err)
      throw new Error('Error creating Docker container')
    })

    try {
      this.container = await docker.createContainer(options)
      return this.container
    } catch (err) {
      debug('%O', err)
      throw new Error('Error creating Docker container')
    }
  }
  start = async (stream: NodeJS.ReadWriteStream) => {
    if (!this.container) throw new Error('No docker container to start up')

    try {
      await this.container.start()
      this.resize()
      process.stdout.on('resize', this.resize)

      await this.container.wait()
      this.handleExit(stream, false)
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
        this.handleExit(stream, false)
      }
      previousKey = key
    })
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
