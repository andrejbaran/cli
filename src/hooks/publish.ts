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
const ops_registry_path = process.env.OPS_REGISTRY_PATH || 'registry.cto.ai'
const ops_registry_host = process.env.OPS_REGISTRY_HOST || `https://${ops_registry_path}`
const ops_registry_auth = {
  username: 'admin',
  password: 'UxvqKhAcRqrOgtscDUJC',
  serveraddress: ops_registry_host
}

export default async function publish(this: any, options: {tag: string, opPath: string, op: Op}) {
  const {op} = options
  const socket = process.env.DOCKER_SOCKET || '/var/run/docker.sock'
  const stats = fs.statSync(socket)

  if (!stats.isSocket()) {
    throw new Error('Are you sure the docker is running?')
  }

  const docker = new Docker({socketPath: socket})
  const image = docker.getImage(`${ops_registry_path}/${op.name}`)
  this.log(`🔋 Creating release ${ux.colors.callOutCyan(ops_registry_path + '/' + op._id.toLowerCase())}... \n`)

  const all = []
  const log = this.log
  const error = this.error
  let size = 0

  let parser = through.obj(function (this: any, chunk: any, _enc: any, cb: any) {
    this.push(chunk.status)
    if (chunk.aux) {
      log(`\n🚀 ${ux.colors.white('Publishing...')}\n`)
      log(`${ux.colors.green('>')} Tag: ${ux.colors.multiBlue(chunk.aux.Tag)}`)
      log(`${ux.colors.green('>')} Size: ${ux.colors.multiBlue(chunk.aux.Size)}`)
      log(`${ux.colors.green('>')} Digest: ${ux.colors.multiBlue(chunk.aux.Digest)}\n`)
      size = chunk.aux.Size
    } else if (chunk.id) {
      log(`${chunk.status}: ${ux.colors.white(chunk.id)}`)
    }
    cb()
  })

  parser._pipe = parser.pipe
  parser.pipe = function (dest: any) {
    return parser._pipe(dest)
  }

  image.tag({repo: `${ops_registry_path}/${op._id.toLowerCase()}:latest`}, (err: any, _data: any) => {
    if (err) return error(err.message, {exist: 2})
    image.push({tag: op.tag, authconfig: ops_registry_auth}, (err: any, stream: any) => {
      if (err) return error(err.message, {exist: 2})
      stream
        .pipe(json.parse())
        .pipe(parser)
        .on('data', (d: any) => {
          all.push(d)
        })
        .on('end', async function () {
          const bar = ux.progress.init()
          bar.start(100, 0)

          for (let i = 0; i < size; i++) {
            bar.update(100 - (size / i))
            await ux.wait(5)
          }

          bar.update(100)
          bar.stop()
          log(`\n🙌 ${ux.colors.callOutCyan(`${ops_registry_path}/${op._id.toLowerCase()}:latest`)} has been published! \n`)
        })
    })
  })
}
