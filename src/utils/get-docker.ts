const {ux} = require('@cto.ai/sdk')
const Docker = require('dockerode')
const fs = require('fs-extra')

/**
 * Helper function to display appropriate error message to the user
 * @param self Is the instance of 'this'
 * @param retry Checks whether the user has retried checking the docker instance
 * @param type The type of error message we want to display
 */
function logError(self: any, retry: boolean, type: string) {
  switch (type) {
  case 'account-create-docker-not-installed': {
    if (!retry) {
      self.log(`\n${ux.colors.reset.cyan('We\'re almost there! You\'ll just need to install Docker for cto.ai ops to run properly - go here to install it now.')}`)
      self.log(`\n${ux.colors.reset.green('→')} https://docs.docker.com/install/`)
      self.log(`${ux.colors.reset.grey('(You\'ll create an account with Docker in order to start the download)')}`)
      self.log('\nOnce installed, make sure you start the Docker app, then come back to this terminal and type \'yes\'. We\'ll be waiting right here when you\'re ready 👍\n')
    } else {
      self.log(`\n${ux.colors.reset.cyan('😅 Oops! It seems that Docker is still not installed on your system.')}`)
      self.log(`\n${ux.colors.reset.cyan('Please check that you\'ve installed it (check your Applications folder) and that it\'s also running.')}`)
      self.log(`\n${ux.colors.reset.cyan('Head here if you need to install it:')}`)
      self.log(`\n${ux.colors.reset.green('→')} https://docs.docker.com/install/`)
      self.log('\nOnce installed, make sure you start the Docker app, then come back to this terminal and type \'yes\'. We\'ll be waiting right here when you\'re ready 👍\n')
    }
    break
  }
  case 'account-create-docker-stopped': {
    if (!retry) {
      self.log(`\n${ux.colors.reset.cyan('It looks like you have Docker installed, but it\'s not currently running.')}`)
      self.log(`\n${ux.colors.reset.cyan('Please start the Docker app to continue (You can find it in the MacOS → Applications folder)')}`)
      self.log(`${ux.colors.reset.grey('Once Docker is running, come back to this terminal and type \'yes\'.')}`)
      self.log(`${ux.colors.reset.grey('We\'ll be waiting right here when you\'re ready 👍')}`)
    } else {
      self.log(`\n${ux.colors.reset.cyan('😅 Oops! Let\'s try that again. It looks like Docker is installed, but the app isn\'t running.')}`)
      self.log(`\n${ux.colors.reset.green('→')} {ux.colors.reset.cyan('Start Docker to continue`)
      self.log(`${ux.colors.reset.grey('(You can find it in the MacOS → Applications folder)')}`)
      self.log('\nOnce you\'ve done that, come back to this terminal and type \'yes\'')
      self.log('\nWe\'ll be waiting right here when you\'re ready 👍')
    }
    break
  }
  default:
    if (type.endsWith('docker-not-installed')) {
      if (!retry) {
        self.log(`\n${ux.colors.reset.cyan('Uh-oh! You\'ll need to install and run Docker for cto.ai ops to work properly - go here to install it now.')}`)
        self.log(`\n${ux.colors.reset.green('→')} https://docs.docker.com/install/`)
        self.log(`${ux.colors.reset.grey('(You\'ll create an account with Docker in order to start the download)')}`)
        self.log('\nOnce installed, make sure you start the Docker app, then come back to this terminal and type \'yes\'. We\'ll be waiting right here when you\'re ready 👍\n')
      } else {
        self.log(`\n${ux.colors.reset.cyan('😅 Oops! It seems that Docker is still not installed on your system.')}`)
        self.log(`\n${ux.colors.reset.cyan('Please check that you\'ve installed it (check your Applications folder) and that it\'s also running.')}`)
        self.log(`\n${ux.colors.reset.cyan('Head here if you need to install it:')}`)
        self.log(`\n${ux.colors.reset.green('→')} https://docs.docker.com/install/`)
        self.log('\nOnce installed, make sure you start the Docker app, then come back to this terminal and type \'yes\'. We\'ll be waiting right here when you\'re ready 👍\n')
      }
    } else {
      if (!retry) {
        self.log(`\n${ux.colors.reset.cyan('It looks like you have Docker installed, but it\'s not currently running.')}`)
        self.log(`\n${ux.colors.reset.cyan('Please start the Docker app to continue (You can find it in the MacOS → Applications folder)')}`)
        self.log(`${ux.colors.reset.grey('Once Docker is running, come back to this terminal and type \'yes\'.')}`)
        self.log(`${ux.colors.reset.grey('We\'ll be waiting right here when you\'re ready 👍')}`)
      } else {
        self.log(`\n${ux.colors.reset.cyan('😅 Oops! Let\'s try that again. It looks like Docker is installed, but the app isn\'t running.')}`)
        self.log(`\n${ux.colors.reset.green('→')} ${ux.colors.reset.cyan('Start Docker to continue')}`)
        self.log(`${ux.colors.reset.grey('(You can find it in the MacOS → Applications folder)')}`)
        self.log('\nOnce you\'ve done that, come back to this terminal and type \'yes\'')
        self.log('\nWe\'ll be waiting right here when you\'re ready 👍')
      }
    }
  }
}

/**
 * Helper function to display the prompt to the user if they want to retry
 */
async function confirmReadyContinue() {
  return ux.prompt({
    type: 'input',
    name: 'answer',
    message: `\n${ux.colors.reset.cyan('Ready to continue? ')}`
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
  let hasRepeated = false // Flag to set whether the prompt has been repeated or not
  let isDockerInstalled = false // Flag to indicate whether docker is installed or not
  while (!isDockerInstalled) {
    try {
      const stats = fs.statSync(socket) // Resets the status of the socket
      // Check the validity of the socket, which is only available if docker is installed
      isDockerInstalled = stats.isSocket()
    } catch {
      logError(self, hasRepeated, `${type}-docker-not-installed`) // Log the error message

      // Ask the user for prompt
      let {answer} = await confirmReadyContinue()

      // Return if user doesn't want to repeat
      if (!answer || answer !== 'yes') process.exit(0) // Exit safely if there is no docker without an error

      hasRepeated = true // Indicates the user has answered once
    }
  }

  /**
   * Checks whether docker is running
   * At this point, assume docker has already been installed
   */
  hasRepeated = false // Re-initialize the flag for repeat
  let isDockerRunning = false // Flag to indicate whether docker is running or not
  let docker: any // Initialize return variable

  while (!isDockerRunning) {
    // Instantiate a new docker client
    docker = new Docker({socketPath: socket})
    try {
      await docker.ping() // Try to ping the docker daemon
      // If successful, set flag to true to exit the while loop
      isDockerRunning = true

    } catch {
      logError(self, hasRepeated, `${type}-docker-stopped`)

      // Ask the user for prompt
      let {answer} = await confirmReadyContinue()

      // Return if user doesn't want to repeat
      if (!answer || answer !== 'yes') process.exit(0) // Exit safely if there is no docker without an error
      hasRepeated = true // Sets the flag to be already repeated
    }
  }
  return docker
}
