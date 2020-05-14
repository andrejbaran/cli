import { ux } from '@cto.ai/sdk'
import Docker from 'dockerode'
import * as fs from 'fs-extra'

import { DOCKER_SOCKET } from '../constants/env'

const INSTALL_DOCKER_MSG = `

${ux.colors.reset.cyan(
  "We're almost there! You'll just need to install Docker for CTO.ai ops to run properly - go here to install it now.",
)}

${ux.colors.reset.green('→')} https://docs.docker.com/install/
${ux.colors.reset.grey(
  "(You'll create an account with Docker in order to start the download)",
)}

Once installed, make sure you start the Docker app, then come back to this terminal and type ${ux.colors.reset.cyan(
  "'Y'",
)}.
We'll be waiting right here when you're ready 👍\n`

const UHOH_INSTALL_DOCKER_MSG = `

${ux.colors.reset.cyan(
  "Uh-oh! You'll just need to install Docker for CTO.ai ops to run properly - go here to install it now.",
)}

${ux.colors.reset.green('→')} https://docs.docker.com/install/
${ux.colors.reset.grey(
  "(You'll create an account with Docker in order to start the download)",
)}

Once installed, make sure you start the Docker app, then come back to this terminal and type ${ux.colors.reset.cyan(
  "'Y'",
)}.
We'll be waiting right here when you're ready 👍\n`

// TODO: This message is Mac-specific
const DOCKER_NOT_RUNNING_MSG = `
${ux.colors.reset.cyan(
  "It looks like you have Docker installed, but it's not currently running.",
)}
${ux.colors.reset.cyan(
  'Please start the Docker app to continue (You can find it in the MacOS → Applications folder)',
)}

Once Docker is running, come back to this terminal and type ${ux.colors.reset.cyan(
  "'Y'",
)}
We'll be waiting right here when you're ready 👍\n
`

const DOCKER_STILL_NOT_RUNNING_MSG = `
${ux.colors.reset.cyan("Hmm. Docker still doesn't seem to be running.")}
${ux.colors.reset.cyan(
  'Please check again, or run, "ops account support" and we\'ll be happy to help you out.',
)}`

const PLEASE_CHECK_AGAIN_MSG = `
${ux.colors.reset.cyan(
  'Please check that Docker is running again and come back here.',
)}`

/**
 * Helper function to display appropriate error message to the user
 * @param self Is the instance of 'this'
 * @param numRepeats Checks the number of retries the user has attempted
 * @param type The type of error message we want to display
 */
function logError(self: any, numRepeats: number, type: string) {
  if (numRepeats >= 3) {
    self.log(DOCKER_STILL_NOT_RUNNING_MSG)
    return
  }
  if (numRepeats) {
    self.log(PLEASE_CHECK_AGAIN_MSG)
    return
  }

  // If we haven't retried we'll need specific messaging
  switch (type) {
    case 'account-create-docker-not-installed': {
      self.log(INSTALL_DOCKER_MSG)
      break
    }
    case 'account-create-docker-stopped': {
      self.log(DOCKER_NOT_RUNNING_MSG)
      break
    }
    default:
      if (type.endsWith('docker-not-installed')) {
        self.log(UHOH_INSTALL_DOCKER_MSG)
      } else {
        self.log(DOCKER_NOT_RUNNING_MSG)
      }
  }
}

/**
 * Helper function to display the prompt to the user if they want to retry
 */
async function confirmReadyContinue(): Promise<{ answer: boolean }> {
  return ux.prompt({
    type: 'confirm',
    name: 'answer',
    message: `${ux.colors.reset.cyan('Ready to continue?')}`,
  })
}

/**
 * Helper function to check the existence of docker
 * @param self Is the instance of 'this'
 * @param type Is the context of the caller, so we know which error to log
 */
export default async function getDocker(
  self: any,
  type: string,
): Promise<Docker> {
  let numRepeats = 0

  // Check whether docker is installed on the machine
  // Keep repeating until the socket is available
  while (true) {
    try {
      // Check the validity of the socket, which is only available if docker is installed
      if (fs.statSync(DOCKER_SOCKET).isSocket()) {
        break
      }
    } catch {
      logError(self, numRepeats, `${type}-docker-not-installed`)

      let { answer } = await confirmReadyContinue()
      if (!answer) {
        process.exit(0) // Exit safely if there is no docker without an error
      }

      numRepeats++
    }
  }

  // Check whether docker is running
  // At this point, we can assume docker has already been installed
  numRepeats = 0
  const docker = new Docker({ socketPath: DOCKER_SOCKET })
  while (true) {
    try {
      await docker.ping()
      // We don't need to retry if the ping succeeds
      break
    } catch {
      logError(self, numRepeats, `${type}-docker-stopped`)

      let { answer } = await confirmReadyContinue()
      if (!answer) {
        process.exit(0) // Exit safely if there is no docker without an error
      }

      numRepeats++
    }
  }
  return docker
}
