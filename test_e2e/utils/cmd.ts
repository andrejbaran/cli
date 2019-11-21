import * as OclifConfig from '@oclif/config'
import fs, { readJsonSync } from 'fs-extra'
import path from 'path'
import { spawn, ChildProcess, SpawnOptions } from 'child_process'
import concat from 'concat-stream'
import axios from 'axios'
import Debug from 'debug'

import { EXISTING_USER_PASSWORD, EXISTING_USER_NAME } from './constants'

const debug = Debug('cmd')
const debugVerbose = Debug('cmd:verbose')

const opsBinary = process.env.npm_config_prefix
  ? `${process.env.npm_config_prefix}/bin/ops`
  : '/usr/local/bin/ops'

const defaultEnv = {
  NODE_ENV: 'test',
  PATH: process.env.PATH,
  OPS_REGISTRY_HOST: 'registry.stg-platform.hc.ai',
  OPS_API_HOST: 'https://www.stg-platform.hc.ai/',
  OPS_GO_API_HOST: 'https://app.stg-platform.hc.ai/',
  // this is obtained from Keycloak Admin > Clients > ops-cli-confidential > Credentials
  OPS_CLIENT_SECRET: '29fb78ce-486c-4606-a75a-fb4928a84a37',
}

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
  command: string = opsBinary,
  options: SpawnOptions = {},
): Promise<string> {
  const env = setEnv(defaultEnv, process.env)

  const childProcess = spawn(command, args, { env, ...options })

  sendInput(inputs, childProcess, timeout)

  return new Promise(resolve => {
    // to enable regular logs set DEBUG=cmd
    // to enable verbose logs set DEBUG=cmd*
    childProcess.stderr.on('data', errChunk => {
      debugVerbose(errChunk.toString())
    })

    childProcess.stdout.on('data', chunk => {
      debugVerbose(chunk.toString())
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
    try {
      if (child.stdin.writable) {
        child.stdin.write(firstInput)
      }
    } catch (error) {
      console.log('%O', error)
    }

    sendInput(remainingInputs, child, timeout)
  }, timeout)
}

const cleanup = async () => {
  try {
    // we are using the Go API here directly because the Feathers API (www) does not have a pass-through method for cleanup
    await axios.get(`${defaultEnv.OPS_GO_API_HOST}api/v1/cleanup`)
    console.log('cleanup endpoint hit successfully')
  } catch (error) {
    console.error({ error })
  }
}

const cleanupAddedOp = async opFullName => {
  try {
    const config = await OclifConfig.load()
    const configData = readJsonSync(path.join(config.configDir, 'config.json'))

    const token = configData && configData.tokens.accessToken

    const [field1, field2] = opFullName.split('/')
    const opTeamName = field1.substring(1)
    const [opName, versionName] = field2.split(':')

    const teamName = EXISTING_USER_NAME
    await axios.delete(
      `${defaultEnv.OPS_GO_API_HOST}api/v1/teams/${teamName}/ops/refs`,
      {
        headers: { Authorization: token },
        data: {
          opName,
          opTeamName,
          versionName,
        },
      },
    )
    console.log('cleaned up added op successfully')
  } catch (error) {
    console.error({ error })
  }
}

const sleep = (milliseconds: number) => {
  return new Promise(resolve => setTimeout(() => resolve(), milliseconds))
}

const signin = async (
  user: string = EXISTING_USER_NAME,
  password: string = EXISTING_USER_PASSWORD,
) => {
  return run(['account:signin', '-u', user, '-p', password])
}

const signout = async () => {
  return run(['account:signout'])
}

export { run, sleep, cleanup, cleanupAddedOp, signin, signout }
