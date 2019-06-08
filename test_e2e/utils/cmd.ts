import { spawn, ChildProcess } from 'child_process'
import concat from 'concat-stream'
import axios from 'axios'
import { DEBUG } from '../../src/constants/env'
import { isTruthy } from '../../src/utils'

const command = '/usr/local/bin/ops'

const defaultEnv = {
  NODE_ENV: 'test',
  DEBUG: 'false',
  PATH: process.env.PATH,
  OPS_REGISTRY_HOST: 'registry.stg-platform.hc.ai',
  OPS_API_HOST: 'https://www.stg-platform.hc.ai/',
  OPS_GO_API_HOST: 'https://app.stg-platform.hc.ai/',
}

// the default test server is staging, but I can override this by passing my own OPS_REGISTRY_HOST and OPS_API_HOST from my shell config, if I want to run tests locally in minikube, for example
const setEnv = (
  defaultEnv: NodeJS.ProcessEnv,
  processEnv: NodeJS.ProcessEnv,
  DEBUG: string,
) => {
  return isTruthy(DEBUG) ? { ...defaultEnv, ...processEnv } : defaultEnv
}

function run(
  args: string[] = [],
  inputs: string[] = [],
  timeout: number = 1500,
): Promise<string> {
  const env = setEnv(defaultEnv, process.env, DEBUG)

  const childProcess = spawn(command, args, { env })

  sendInput(inputs, childProcess, timeout)

  return new Promise(resolve => {
    // for verbose logs set DEBUG to a truthy value
    if (isTruthy(DEBUG)) {
      childProcess.stderr.on('data', errChunk => {
        console.log('errChunk', errChunk.toString())
      })

      childProcess.stdout.on('data', chunk => {
        console.log({ chunk: chunk.toString() })
      })
    }

    childProcess.stdout.pipe(
      concat((buffer: Buffer) => {
        const result = buffer.toString()
        if (isTruthy(DEBUG)) {
          console.log(result)
        }
        resolve(result)
      }),
    )
  })
}

const sendInput = function(
  inputs: string[],
  child: ChildProcess,
  timeout: number,
) {
  if (!inputs.length) {
    return child.stdin.end()
  }

  const [firstInput, ...remainingInputs] = inputs
  setTimeout(() => {
    child.stdin.write(firstInput)
    sendInput(remainingInputs, child, timeout)
  }, timeout)
}

const cleanup = async () => {
  try {
    // we are using the Go API here directly because www does not have a pass-through method for cleanup
    await axios.get(`${defaultEnv.OPS_GO_API_HOST}api/v1/cleanup`)
    console.log('test user cleaned up successfully')
  } catch (error) {
    console.error({ error })
  }
}

const sleep = (milliseconds: number) => {
  return new Promise(resolve => setTimeout(() => resolve(), milliseconds))
}

const DOWN = '\x1B\x5B\x42'
const UP = '\x1B\x5B\x41'
const ENTER = '\x0D'
const SPACE = '\x20'
const NEW_OP_NAME = 't_my_new_op'
const NEW_OP_DESCRIPTION = 'my new op description'

const EXISTING_OP_NAME = 'write_a_file_op'

const EXISTING_USER_EMAIL = 'e2e_existing_user@cto.ai'
const EXISTING_USER_PASSWORD = 'password'

const NEW_USER_EMAIL = 't_email_new_user@cto.ai'
const NEW_USER_NAME = 't_user_new'
const NEW_USER_PASSWORD = 'password'

const NEW_FILE = 'BRANDNEWFILE.txt'

export {
  run,
  sleep,
  cleanup,
  DOWN,
  UP,
  ENTER,
  SPACE,
  NEW_OP_NAME,
  NEW_OP_DESCRIPTION,
  NEW_USER_EMAIL,
  NEW_USER_NAME,
  NEW_USER_PASSWORD,
  EXISTING_USER_EMAIL,
  EXISTING_USER_PASSWORD,
  EXISTING_OP_NAME,
  NEW_FILE,
}
