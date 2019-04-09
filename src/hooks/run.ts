/**
 * Author: Brett Campbell (brett@hackcapital.com)
 * Date: Friday, 5th April 2019 12:06:07 pm
 * Last Modified By: Brett Campbell (brett@hackcapital.com)
 * Last Modified Time: Friday, 5th April 2019 12:06:08 pm
 *
 * DESCRIPTION
 *
 */
const Docker = require('dockerode')
const fs = require('fs-extra')

import Op from '../types/op'

const ops_registry_host = process.env.OPS_REGISTRY_HOST || 'registry.cto.ai'

export default async function run(options: {tag: string, opPath: string, op: Op}) {
  const {op} = options
  const socket = process.env.DOCKER_SOCKET || '/var/run/docker.sock'
  const stats = fs.statSync(socket)

  if (!stats.isSocket()) {
    throw new Error('Are you sure the docker is running?')
  }

  const docker = new Docker({socketPath: socket})
  docker.getImage(`${ops_registry_host}/${op.name}`)
  console.log(`${ops_registry_host}/${op.name}`)
}
