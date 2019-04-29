/**
 * Author: Brett Campbell (brett@hackcapital.com)
 * Date: Friday, 5th April 2019 12:06:07 pm
 * Last Modified By: Brett Campbell (brett@hackcapital.com)
 * Last Modified Time: Friday, 5th April 2019 12:06:08 pm
 *
 * DESCRIPTION
 *
 */
import { ux } from '@cto.ai/sdk'
import * as through from 'through2'
import * as json from 'JSONStream'

import Op from '../types/Op'
import RegistryAuth from '../types/RegistryAuth'
import getDocker from '../utils/get-docker'

export default async function publish(
  this: any,
  options: {
    op: Op
    ops_registry_host: string
    ops_registry_auth: RegistryAuth
  },
) {
  const { op, ops_registry_host, ops_registry_auth } = options
  const self = this
  const docker = await getDocker(self, 'publish')
  if (!docker) {
    throw new Error('Could not initialize Docker.')
  }
  const image = docker.getImage(`${ops_registry_host}/${op.name}`)
  this.log(
    `🔋 Creating release ${ux.colors.callOutCyan(
      ops_registry_host + '/' + op.id.toLowerCase(),
    )}... \n`,
  )

  const all: any[] = []
  const log = this.log
  const error = this.error
  let size = 0

  let parser = through.obj(function(this: any, chunk: any, _enc: any, cb: any) {
    this.push(chunk.status)
    if (chunk.aux) {
      log(`\n🚀 ${ux.colors.white('Publishing...')}\n`)
      log(`${ux.colors.green('>')} Tag: ${ux.colors.multiBlue(chunk.aux.Tag)}`)
      log(
        `${ux.colors.green('>')} Size: ${ux.colors.multiBlue(chunk.aux.Size)}`,
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

  parser._pipe = parser.pipe
  parser.pipe = function(dest: any) {
    return parser._pipe(dest)
  }

  image.tag(
    { repo: `${ops_registry_host}/${op.id.toLowerCase()}` },
    (err: any, _data: any) => {
      if (err) return error(err.message, { exist: 2 })
      const image = docker.getImage(
        `${ops_registry_host}/${op.id.toLowerCase()}`,
      )
      image.push(
        {
          tag: 'latest',
          authconfig: ops_registry_auth,
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
                  `${ops_registry_host}/${op.id.toLowerCase()}:latest`,
                )} has been published! \n`,
              )
            })
        },
      )
    },
  )
}
