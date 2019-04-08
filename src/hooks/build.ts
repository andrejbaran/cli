/**
 * Author: Brett Campbell (brett@hackcapital.com)
 * Date: Friday, 5th April 2019 12:06:07 pm
 * Last Modified By: Brett Campbell (brett@hackcapital.com)
 * Last Modified Time: Friday, 5th April 2019 12:06:08 pm
 *
 * DESCRIPTION
 *
 */
const {ux} = require('@cto.ai/sdk')
const Docker = require('dockerode')
const fs = require('fs-extra')
const through = require('through2')
const json = require('JSONStream')

import Op from '../types/op'

export default async function build(this:any, options:
  {tag: string, opPath: string, op: Op}
) {
  const {opPath, tag, op} = options
  const socket = process.env.DOCKER_SOCKET || '/var/run/docker.sock'
  const stats = fs.statSync(socket)

  if (!stats.isSocket()) {
    throw new Error('Are you sure the docker is running?')
  }

  const docker = new Docker({socketPath: socket})

  const all = []
  const log = this.log
  const error = this.error
  let size = 0

  let parser = through.obj(function (this:any, chunk:any, enc:any, cb:any) {
    if (chunk.stream && chunk.stream !== '\n') {
       this.push(chunk.stream.replace('\n', ''))
       log(chunk.stream.replace('\n', ''))
       all.push(chunk)
     } else if (chunk.errorDetail) {

       return error(new Error(chunk.errorDetail.message), {exit: 2})
     }
    cb()
  })

  parser._pipe = parser.pipe
  parser.pipe = function (dest:any) {
    return parser._pipe(dest)
  }

  docker.buildImage({context: opPath, src: op.src}, {t: tag})
    .then((stream: any) => {
      stream
        .pipe(json.parse())
        .pipe(parser)
        .on('data',(d:any) => {
          all.push(d)
        })
        .on('end', async function () {

          log('\n⚡️ Verifying...')
          const bar = ux.progress.init()
          let counter = 0
          bar.start(100, 0)

          for (let i = 0; i < all.length; i++) {
            bar.update(100 - (all.length / i))
            await ux.wait(50)
          }

          bar.update(100)
          bar.stop()

          log(`\n💻 Run ${ux.colors.green('$')} ${ux.colors.italic.dim('ops run ' + op.name)} to test your op.`)
          log(`📦 Run ${ux.colors.green('$')} ${ux.colors.italic.dim('ops publish ' + opPath)} to share your op. \n`)

        })

    })
}
