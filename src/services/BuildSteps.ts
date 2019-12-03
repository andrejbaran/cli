import * as fs from 'fs-extra'
import * as path from 'path'
import { Op, User, Config, Workflow } from '../types'
import { FeathersClient } from './Feathers'
import { Publish } from './Publish'
import { OpService } from './../services/Op'
import { RegistryAuthService } from './../services/RegistryAuth'
import Debug from 'debug'
import {
  CouldNotGetRegistryToken,
  InvalidGlueCode,
} from '~/errors/CustomErrors'
import { GLUECODE_TYPE } from '~/constants/opConfig'
const debug = Debug('ops:BuildStepsService')

export class BuildSteps {
  public isGlueCode = async (step: string): Promise<boolean> => {
    if (step === '') {
      return false
    }

    return !this.isOpRun(step)
  }

  public buildAndPublishGlueCode = async (
    step: string,
    teamID: string,
    teamName: string,
    accessToken: string,
    opPath: string,
    user: User,
    publishService: Publish,
    opService: OpService,
    featherClient: FeathersClient,
    registryAuthService: RegistryAuthService,
    config: Config,
    isPublic: boolean,
    version: string,
  ): Promise<string> => {
    const indexJs = path.resolve(opPath, 'index.js')
    fs.writeFileSync(
      indexJs,
      `const { ux,sdk } = require('@cto.ai/sdk')

    async function main() {
      ${step}
    }

    main()`,
    )

    const rand = Math.random()
      .toString(36)
      .substring(7)
    const opName = `gluecode-${rand}`

    const glueCodeOp = <Op>{
      bind: ['/tmp:/tmp', 'Dockerfile'],
      description: 'glue code',
      publishDescription: 'glue code',
      mountCwd: false,
      mountHome: false,
      name: opName,
      network: 'host',
      version: 'latest',
      run: '/bin/sdk-daemon node /ops/index.js',
      src: ['Dockerfile', 'index.js', 'package.json', '.dockerignore'],
      isPublic: isPublic,
      type: GLUECODE_TYPE,
    }

    const glueCodeClone: Op = JSON.parse(JSON.stringify(glueCodeOp))
    await opService.opsBuildLoop(
      [glueCodeClone],
      path.resolve(__dirname, '../templates/workflowsteps/js'),
      config,
    )

    if (!('run' in glueCodeOp)) {
      throw new InvalidGlueCode()
    }

    const { data: apiOp } = await publishService.publishOpToAPI(
      glueCodeOp,
      '1',
      teamName,
      accessToken,
      featherClient,
      true,
    )

    const registryAuth = await registryAuthService
      .create(
        accessToken,
        teamName,
        glueCodeOp.name,
        'latest',
        false,
        true, // pushAccess is true as its publish
      )
      .catch(err => {
        throw new CouldNotGetRegistryToken(err)
      })

    await publishService
      .publishOpToRegistry(
        apiOp,
        registryAuth,
        teamName,
        accessToken,
        registryAuthService,
        featherClient,
        version,
      )
      .catch(err => {
        throw new CouldNotGetRegistryToken(err)
      })
    return `ops run @${teamName}/${opName}:${apiOp.version}`
  }

  public isOpRun(step: string): boolean {
    const processedStep = step
      .toLowerCase()
      .replace(/\s\s+/g, ' ')
      .trim()
    const opsRunPrefix = 'ops run'

    return processedStep.lastIndexOf(opsRunPrefix, 0) === 0
  }
}
