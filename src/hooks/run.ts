/**
 * Author: Brett Campbell (brett@hackcapital.com)
 * Date: Friday, 5th April 2019 12:06:07 pm
 * Last Modified By: Brett Campbell (brett@hackcapital.com)
 * Last Modified Time: Friday, 5th April 2019 12:06:08 pm
 *
 * DESCRIPTION
 *
 */
import Op from '../types/Op'
import getDocker from '../utils/get-docker'

const ops_registry_host = process.env.OPS_REGISTRY_HOST || 'registry.cto.ai'

export default async function run(options: {
  tag: string
  opPath: string
  op: Op
}) {
  const { op } = options
  const self = this

  const docker = await getDocker(self, 'run')
  if (!docker) {
    throw new Error('Could not initialize Docker')
  }
  docker.getImage(`${ops_registry_host}/${op.name}`)
  console.log(`${ops_registry_host}/${op.name}`)
}
