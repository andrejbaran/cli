/**
 * @author: Brett Campbell (brett@hackcapital.com)
 * @date: Friday, 5th April 2019 12:06:07 pm
 * @lastModifiedBy: JP Lew (jp@cto.ai)
 * @lastModifiedTime: Friday, 3rd May 2019 12:02:37 pm
 * @copyright (c) 2019 CTO.ai
 *
 */

import { ux } from '@cto.ai/sdk'
import * as through from 'through2'
import * as json from 'JSONStream'
import Dockerode from 'dockerode'

import { Op, RegistryAuth } from '../types'
import getDocker from '../utils/get-docker'
import { DockerPublishNoImageFound } from '../errors/customErrors'

export default async function publish(
  this: any,
  options: {
    op: Op
    registryAuth: RegistryAuth
  },
) {
  const {
    op,
    registryAuth: { authconfig, projectFullName },
  } = options

  const imageUniqueId = `${projectFullName}/${op.id.toLowerCase()}`
  // reg.local.hc.ai/jplew/ae2f60b1-4edd-4660-a087-7b530869df0f

  const imageName = `${projectFullName}/${op.name}`
  // reg.local.hc.ai/jplew/banana

  const self = this
  const docker = await getDocker(self, 'publish')

  try {
    if (!docker) {
      throw new Error('Could not initialize Docker.')
    }

    // getImage always returns an image. Must listImages
    const image: Dockerode.Image | undefined = docker.getImage(imageName)
    if (!image) {
      throw new DockerPublishNoImageFound(op.name)
    }

    this.log(
      `🔋 Creating release ${ux.colors.callOutCyan(imageUniqueId)}... \n`,
    )

    const all: any[] = []
    const log = this.log
    const error = this.error
    let size = 0

    let parser = through.obj(function(
      this: any,
      chunk: any,
      _enc: any,
      cb: any,
    ) {
      this.push(chunk.status)
      if (chunk.aux) {
        log(`\n🚀 ${ux.colors.white('Publishing...')}\n`)
        log(
          `${ux.colors.green('>')} Tag: ${ux.colors.multiBlue(chunk.aux.Tag)}`,
        )
        log(
          `${ux.colors.green('>')} Size: ${ux.colors.multiBlue(
            chunk.aux.Size,
          )}`,
        )
        log(
          `${ux.colors.green('>')} Digest: ${ux.colors.multiBlue(
            chunk.aux.Digest,
          )}\n`,
        )
        size = chunk.aux.Size
      } else if (chunk.id) {
        log(`${chunk.status}: ${ux.colors.white(chunk.id)}`)
      }
      cb()
    })

    const _pipe = parser.pipe
    parser.pipe = function(dest: any) {
      return _pipe(dest)
    }

    image.tag({ repo: imageUniqueId }, (err: any, _data: any) => {
      if (err) return error(err.message, { exist: 2 })
      const image = docker.getImage(imageUniqueId)
      image.push(
        {
          tag: 'latest',
          authconfig,
        },
        (err: any, stream: any) => {
          if (err) return error(err.message, { exist: 2 })
          stream
            .pipe(json.parse())
            .pipe(parser)
            .on('data', (d: any) => {
              all.push(d)
            })
            .on('end', async function() {
              const bar = ux.progress.init()
              bar.start(100, 0)

              for (let i = 0; i < size; i++) {
                bar.update(100 - size / i)
                await ux.wait(5)
              }

              bar.update(100)
              bar.stop()
              log(
                `\n🙌 ${ux.colors.callOutCyan(
                  imageUniqueId,
                )} has been published! \n`,
              )
            })
        },
      )
    })
  } catch (err) {
    this.log(err.message)
    process.exit(1)
  }
}
