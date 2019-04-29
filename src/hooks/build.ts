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
import through from 'through2'
import json from 'JSONStream'

import Op from '../types/Op'
import getDocker from '../utils/get-docker'
import Docker from 'dockerode'

async function build(
  this: any,
  options: { tag: string; opPath: string; op: Op },
) {
  const { opPath, tag, op } = options

  const all: any[] = []
  const log = this.log
  const error = this.error
  let parser = through.obj(function(this: any, chunk: any, _enc: any, cb: any) {
    if (chunk.stream && chunk.stream !== '\n') {
      this.push(chunk.stream.replace('\n', ''))
      log(chunk.stream.replace('\n', ''))
      all.push(chunk)
    } else if (chunk.errorDetail) {
      return error(new Error(chunk.errorDetail.message), { exit: 2 })
    }
    cb()
  })

  parser._pipe = parser.pipe
  parser.pipe = function(dest: any) {
    return parser._pipe(dest)
  }
  await new Promise(async function(resolve, reject) {
    const self = this
    const docker = await getDocker(self, 'build')

    if (docker) {
      const stream = await docker
        .buildImage({ context: opPath, src: op.src }, { t: tag })
        .catch(err => {
          console.error('surprise', err)
          reject()
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
export default build
