import { spawn, ChildProcess } from 'child_process'
import concat from 'concat-stream'
import axios from 'axios'
import createDebug from 'debug'
import { ENTER } from './constants'

const debug = createDebug('cmd')

const command = process.env.npm_config_prefix
  ? `${process.env.npm_config_prefix}/bin/ops`
  : '/usr/local/bin/ops'

const defaultEnv = {
  NODE_ENV: 'test',
  PATH: process.env.PATH,
  OPS_REGISTRY_HOST: 'registry.stg-platform.hc.ai',
  OPS_API_HOST: 'https://www.stg-platform.hc.ai/',
  OPS_GO_API_HOST: 'https://app.stg-platform.hc.ai/',
}

// the default test server is staging, but I can override this by passing my own OPS_REGISTRY_HOST and OPS_API_HOST from my shell config, if I want to run tests locally in minikube, for example
const setEnv = (
  defaultEnv: NodeJS.ProcessEnv,
  processEnv: NodeJS.ProcessEnv,
) => {
  return { ...defaultEnv, ...processEnv }
  /*
   * to-do: when we pass in only the defaultEnv, we are unable to run the
   * existing op (write_a_file_op)... Therefore, I'm merging the env by default
   * until we figure out why
   */
  // return DEBUG ? { ...defaultEnv, ...processEnv } : defaultEnv
}

function run(
  args: string[] = [],
  inputs: string[] = [],
  timeout: number = 1500,
): Promise<string> {
  const env = setEnv(defaultEnv, process.env)

  const childProcess = spawn(command, args, { env })

  sendInput(inputs, childProcess, timeout)

  return new Promise(resolve => {
    // for verbose logs set DEBUG to a truthy value
    childProcess.stderr.on('data', errChunk => {
      debug('errChunk', errChunk.toString())
    })

    childProcess.stdout.on('data', chunk => {
      debug({ chunk: chunk.toString() })
    })

    childProcess.stdout.pipe(
      concat((buffer: Buffer) => {
        const result = buffer.toString()
        debug(result)
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

const signup = async (email: string, name: string, password: string) => {
  try {
    return run(
      ['account:signup'],
      [email, ENTER, name, ENTER, password, ENTER, password, ENTER],
    )
  } catch (e) {
    console.error('account:signup', e)
  }
}

const signin = async (email: string, password: string) => {
  try {
    return run(['account:signin'], [email, ENTER, password, ENTER])
  } catch (e) {
    console.error('account:signin', e)
  }
}

export { run, sleep, cleanup, signin, signup }
