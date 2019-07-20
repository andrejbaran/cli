import { ux } from '@cto.ai/sdk'
import Docker, { AuthConfig } from 'dockerode'
import Debug from 'debug'
import through from 'through2'
import json from 'JSONStream'

import { Op, Config } from '~/types'
import { ReadFileError, DockerBuildImageError } from '~/errors/customErrors'
import getDocker from '~/utils/get-docker'
const debug = Debug('ops:ImageService')

export class ImageService {
  log = console.log
  checkLocalImage = async (opImageUrl: string) => {
    const docker = await getDocker(console, 'ImageService')

    const list: Docker.ImageInfo[] = await docker.listImages()

    return list
      .map(this.imageFilterPredicate(opImageUrl))
      .find((repoTag: string) => !!repoTag)
  }
  imageFilterPredicate = (repo: string) => ({ RepoTags }: Docker.ImageInfo) => {
    if (!RepoTags) return
    return RepoTags.find((repoTag: string) => repoTag.includes(repo))
  }

  pull = async (op: Op, authconfig: AuthConfig): Promise<void> => {
    this.log(`🔋 Pulling ${ux.colors.dim(op.name)} from registry...\n`)
    const docker = await getDocker(console, 'ImageServicePull')
    const stream = await docker.pull(op.image || '', { authconfig })

    if (!stream) throw new Error('No stream')

    const parser = await this.setParser(op, this.getProgressBarText)
    await new Promise(this.updateStatusBar(stream, parser))

    ux.spinner.stop(ux.colors.green('Done!'))
    const msg = `${ux.colors.italic.bold(`${op.name}:${op.id}`)}`
    this.log(`\n🙌 Saved ${msg} locally! \n`)
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

  build = async (tag: string, opPath: string, op: Op) => {
    const all: any[] = []
    const log = this.log
    let parser = through.obj(function(
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
        throw new ReadFileError(chunk.errorDetail.message)
      }
      cb()
    })

    const _pipe = parser.pipe
    parser.pipe = function(dest: any) {
      return _pipe(dest)
    }
    await new Promise(async function(resolve, reject) {
      const docker = await getDocker(console, 'build')

      if (docker) {
        const stream = await docker
          .buildImage({ context: opPath, src: op.src }, { t: tag })
          .catch(err => {
            debug('%O', err)
            reject(new DockerBuildImageError(err))
            return null
          })

        if (stream) {
          stream
            .pipe(json.parse())
            .pipe(parser)
            .on('data', (d: any, data: any) => {
              all.push(d)
            })
            .on('end', async function() {
              log('\n⚡️ Verifying...')
              const bar = ux.progress.init()
              bar.start(100, 0)
              for (let i = 0; i < all.length; i++) {
                bar.update(100 - all.length / i)
                await ux.wait(50)
              }
              bar.update(100)
              bar.stop()
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
        }
      }
    })
  }
}
