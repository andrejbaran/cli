import { Hook } from '@oclif/config'

import CTOCommand from '~/base'
import getDocker from '~/utils/get-docker'

const hook: Hook<'prerun'> = async function(opts) {
  try {
    const command = opts.Command.id

    // not including `run` here because local ops work without Docker
    const dockerDependentCommands = ['publish', 'build']

    if (dockerDependentCommands.includes(command)) {
      const docker = await getDocker(CTOCommand, command)
    }
  } catch (err) {
    await this.config.runHook('error', { err })
  }
}

export default hook
