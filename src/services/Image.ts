import { ux } from '@cto.ai/sdk'
import Debug from 'debug'
import Docker, { AuthConfig } from 'dockerode'
import json from 'JSONStream'
import through from 'through2'
import * as path from 'path'
import * as fs from 'fs-extra'

import { DockerBuildImageError, ImagePullError } from '~/errors/CustomErrors'
import { ErrorService } from '~/services/Error'
import { OpCommand } from '~/types'
import getDocker from '~/utils/get-docker'

const debug = Debug('ops:ImageService')

export class ImageService {
  constructor(protected error = new ErrorService()) {}
  log = console.log

  checkLocalImage = async (opImageUrl: string) => {
    const docker = await getDocker(console, 'ImageService')

    const list: Docker.ImageInfo[] = await docker.listImages()

    return list
      .map(this.imageFilterPredicate(opImageUrl))
      .find((repoTag: string) => !!repoTag)
  }

  imageFilterPredicate = (repo: string) => ({ RepoTags }: Docker.ImageInfo) => {
    if (!RepoTags) {
      return
    }
    return RepoTags.find((repoTag: string) => repoTag.includes(repo))
  }

  pull = async (op: OpCommand, authconfig: AuthConfig): Promise<void> => {
    const docker = await getDocker(console, 'ImageServicePull')
    const stream = await docker
      .pull(op.image || '', { authconfig })
      .catch(err => {
        throw new ImagePullError(err)
      })
    if (!stream) {
      throw new Error('No stream')
    }
    this.log(`🔋 Pulling ${ux.colors.dim(op.name)} from registry...\n`)

    const parser = this.setParser(op, this.getProgressBarText)
    await new Promise(this.updateStatusBar(stream, parser))

    ux.spinner.stop(ux.colors.green('Done!'))
    const msg = `${ux.colors.italic.bold(`${op.name}:${op.id}`)}`
    this.log(`\n🙌 Saved ${msg} locally! \n`)
  }

  setParser = (
    op: OpCommand,
    getFn: (status: string, op: OpCommand) => { speed: string },
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

      if (id) {
        layers[id] = id
      }
      if (speed) {
        bar.update(progress, { speed })
      }

      callback()
    })

    const _pipe = parser.pipe
    parser.pipe = dest => _pipe(dest)
    return { parser, bar }
  }

  getProgressBarText = (status: string, { name }: OpCommand) => {
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
        debug('%O', err)
        return err ? reject(err) : resolve(allData)
      })
  }

  checkIfDockerfileExists = (opPath: string): boolean => {
    const pathToDockerfile = path.join(path.resolve(opPath), 'Dockerfile')
    return fs.existsSync(pathToDockerfile)
  }

  build = async (tag: string, opPath: string, op: OpCommand) => {
    try {
      const dockerfileExists = this.checkIfDockerfileExists(opPath)

      if (!dockerfileExists) {
        throw new Error(
          `Unable to build an image for this op. If you are inside your op directory, please run ${ux.colors.green(
            '$',
          )} ${ux.colors.italic.dim('ops run .')} or ${ux.colors.green(
            '$',
          )} ${ux.colors.italic.dim('ops build .')} instead.\n`,
        )
      }

      const all: any[] = []
      const errors: any[] = []
      const log = this.log
      const parser = through.obj(function(
        this: any,
        chunk: any,
        _enc: any,
        cb: any,
      ) {
        if (chunk.stream && chunk.stream !== '\n') {
          this.push(chunk.stream.replace('\n', ''))
          log(chunk.stream.replace('\n', ''))
          all.push(chunk)
        } else if (chunk.errorDetail) {
          debug(chunk.errorDetail)
          errors.push(chunk.errorDetail.message)
        }
        cb()
      })

      const _pipe = parser.pipe
      parser.pipe = function(dest: any) {
        return _pipe(dest)
      }
      const docker = await getDocker(console, 'build')
      // TODO: What error handling should we do if this is falsy
      if (!docker) {
        return
      }

      const stream = await docker
        .buildImage({ context: opPath, src: op.src }, { t: tag, pull: true })
        .catch(err => {
          debug('%O', err)
          throw new DockerBuildImageError(err)
        })
      // TODO: What error handling should we do if this is falsy
      if (!stream) {
        return
      }

      await new Promise(function(resolve, reject) {
        stream
          .pipe(json.parse())
          .pipe(parser)
          .on('data', (d: any, data: any) => {
            all.push(d)
          })
          .on('end', function() {
            if (errors.length) {
              return reject(new DockerBuildImageError(errors[0]))
            }
            log(
              `\n💻 Run ${ux.colors.green('$')} ${ux.colors.italic.dim(
                'ops run ' + op.name,
              )} to test your op.`,
            )
            log(
              `📦 Run ${ux.colors.green('$')} ${ux.colors.italic.dim(
                'ops publish ' + opPath,
              )} to share your op. \n`,
            )

            resolve()
          })
      })
    } catch (err) {
      debug('%O', err)
      this.error.handleError({ err })
    }
  }
}
