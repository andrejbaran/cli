import { ux } from '@cto.ai/sdk'
import Docker from 'dockerode'
import Debug from 'debug'

import { OpCommand } from '~/types'
import getDocker from '~/utils/get-docker'

const debug = Debug('ops:ContainerService')

export class ContainerService {
  log = console.log
  container
  create = async (
    op: OpCommand,
    options: Docker.ContainerCreateOptions,
  ): Promise<Docker.Container> => {
    const docker = await getDocker(console, 'ContainerService')
    this.log(`⚙️  Running ${ux.colors.dim(op.name)}...`)
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
