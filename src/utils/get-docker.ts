import { ux } from '@cto.ai/sdk'
import Docker from 'dockerode'
import * as fs from 'fs-extra'

/**
 * Helper function to display appropriate error message to the user
 * @param self Is the instance of 'this'
 * @param numRepeats Checks the number of retries the user has attempted
 * @param type The type of error message we want to display
 */
function logError(self: any, numRepeats: number, type: string) {
  switch (type) {
    case 'account-create-docker-not-installed': {
      if (!numRepeats) {
        self.log(
          `\n${ux.colors.reset.cyan(
            "We're almost there! You'll just need to install Docker for CTO.ai ops to run properly - go here to install it now.",
          )}`,
        )
        self.log(
          `\n${ux.colors.reset.green('→')} https://docs.docker.com/install/`,
        )
        self.log(
          `${ux.colors.reset.grey(
            "(You'll create an account with Docker in order to start the download)",
          )}`,
        )
        self.log(
          `\nOnce installed, make sure you start the Docker app, then come back to this terminal and type ${ux.colors.reset.cyan(
            "'Y'",
          )}.`,
        )
        self.log("We'll be waiting right here when you're ready 👍\n")
      } else if (numRepeats >= 3) {
        self.log(
          `\n${ux.colors.reset.cyan(
            "Hmm. Docker still doesn't seem to be running.",
          )}`,
        )
        self.log(
          `${ux.colors.reset.cyan(
            'Please check again, or run, "ops account support" and we\'ll be happy to help you out.',
          )}`,
        )
      } else {
        self.log(
          `\n${ux.colors.reset.cyan(
            'Please check that Docker is running again and come back here.',
          )}`,
        )
      }
      break
    }
    case 'account-create-docker-stopped': {
      if (!numRepeats) {
        self.log(
          `\n${ux.colors.reset.cyan(
            "It looks like you have Docker installed, but it's not currently running.",
          )}`,
        )
        self.log(
          `${ux.colors.reset.cyan(
            'Please start the Docker app to continue (You can find it in the MacOS → Applications folder)',
          )}`,
        )
        self.log(
          `\nOnce Docker is running, come back to this terminal and type ${ux.colors.reset.cyan(
            "'Y'",
          )}`,
        )
        self.log("We'll be waiting right here when you're ready 👍\n")
      } else if (numRepeats >= 3) {
        self.log(
          `\n${ux.colors.reset.cyan(
            "Hmm. Docker still doesn't seem to be running.",
          )}`,
        )
        self.log(
          `${ux.colors.reset.cyan(
            'Please check again, or run, "ops account support" and we\'ll be happy to help you out.',
          )}`,
        )
      } else {
        self.log(
          `\n${ux.colors.reset.cyan(
            'Please check that Docker is running again and come back here.',
          )}`,
        )
      }
      break
    }
    default:
      if (type.endsWith('docker-not-installed')) {
        if (!numRepeats) {
          self.log(
            `\n${ux.colors.reset.cyan(
              "Uh-oh! You'll need to install and run Docker for CTO.ai ops to work properly - go here to install it now.",
            )}`,
          )
          self.log(
            `\n${ux.colors.reset.green('→')} https://docs.docker.com/install/`,
          )
          self.log(
            `${ux.colors.reset.grey(
              "(You'll create an account with Docker in order to start the download)",
            )}`,
          )
          self.log(
            `\nOnce installed, make sure you start the Docker app, then come back to this terminal and type ${ux.colors.reset.cyan(
              "'Y'",
            )}.`,
          )
          self.log("We'll be waiting right here when you're ready 👍\n")
        } else if (numRepeats >= 3) {
          self.log(
            `\n${ux.colors.reset.cyan(
              "Hmm. Docker still doesn't seem to be running.",
            )}`,
          )
          self.log(
            `${ux.colors.reset.cyan(
              'Please check again, or run, "ops account support" and we\'ll be happy to help you out.',
            )}`,
          )
        } else {
          self.log(
            `\n${ux.colors.reset.cyan(
              'Please check that Docker is running again and come back here.',
            )}`,
          )
        }
      } else {
        if (!numRepeats) {
          self.log(
            `\n${ux.colors.reset.cyan(
              "It looks like you have Docker installed, but it's not currently running.",
            )}`,
          )
          self.log(
            `${ux.colors.reset.cyan(
              'Please start the Docker app to continue (You can find it in the MacOS → Applications folder)',
            )}`,
          )
          self.log(
            `\nOnce Docker is running, come back to this terminal and type ${ux.colors.reset.cyan(
              "'Y'",
            )}`,
          )
          self.log("We'll be waiting right here when you're ready 👍\n")
        } else if (numRepeats >= 3) {
          self.log(
            `\n${ux.colors.reset.cyan(
              "Hmm. Docker still doesn't seem to be running.",
            )}`,
          )
          self.log(
            `${ux.colors.reset.cyan(
              'Please check again, or run, "ops account support" and we\'ll be happy to help you out.',
            )}`,
          )
        } else {
          self.log(
            `\n${ux.colors.reset.cyan(
              'Please check that Docker is running again and come back here.',
            )}`,
          )
        }
      }
  }
}

/**
 * Helper function to display the prompt to the user if they want to retry
 */
async function confirmReadyContinue() {
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
export default async function getDocker(self: any, type: string) {
  // Point to the docke socket
  const socket = process.env.DOCKER_SOCKET || '/var/run/docker.sock'

  /**
   * Checks whether docker is installed on the machine
   * Keep repeating until the socket is available
   */
  let numRepeats = 0 // Flag to set whether the prompt has been repeated or not
  let isDockerInstalled = false // Flag to indicate whether docker is installed or not
  while (!isDockerInstalled) {
    try {
      const stats = fs.statSync(socket) // Resets the status of the socket
      // Check the validity of the socket, which is only available if docker is installed
      isDockerInstalled = stats.isSocket()
    } catch {
      logError(self, numRepeats, `${type}-docker-not-installed`) // Log the error message

      // Ask the user for prompt
      let { answer } = await confirmReadyContinue()

      // Return if user doesn't want to repeat
      if (!answer) process.exit(0) // Exit safely if there is no docker without an error

      numRepeats++ // Adds the number of errors the user has repeated
    }
  }

  /**
   * Checks whether docker is running
   * At this point, assume docker has already been installed
   */
  numRepeats = 0 // Re-initialize the flag for repeat
  let isDockerRunning = false // Flag to indicate whether docker is running or not
  let docker: Docker // Initialize return variable

  while (!isDockerRunning) {
    // Instantiate a new docker client
    docker = new Docker({ socketPath: socket })
    try {
      await docker.ping() // Try to ping the docker daemon
      // If successful, set flag to true to exit the while loop
      isDockerRunning = true
    } catch {
      logError(self, numRepeats, `${type}-docker-stopped`)

      // Ask the user for prompt
      let { answer } = await confirmReadyContinue()

      // Return if user doesn't want to repeat
      if (!answer) process.exit(0) // Exit safely if there is no docker without an error
      numRepeats++ // Adds the number of errors the user has repeated
    }
  }
  return docker
}
