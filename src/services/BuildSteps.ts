import * as fs from 'fs-extra'
import * as path from 'path'
import { Op, User, Config, Workflow } from '../types'
import { FeathersClient } from './Feathers'
import { Publish } from './Publish'
import { OpService } from './../services/Op'
import { RegistryAuthService } from './../services/RegistryAuth'
import Debug from 'debug'
import { CouldNotGetRegistryToken } from '~/errors/CustomErrors'
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
      `const { sdk } = require('@cto.ai/sdk')

    async function main() {
      sdk.log('${step}')
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
      mountCwd: false,
      mountHome: false,
      name: opName,
      network: 'host',
      run: '/bin/sdk-daemon node /ops/index.js',
      src: ['Dockerfile', 'index.js', 'package.json', '.dockerignore'],
      isPublic: isPublic,
    }

    const glueCodeClone: Op = JSON.parse(JSON.stringify(glueCodeOp))
    await opService.opsBuildLoop(
      [glueCodeClone],
      path.resolve(__dirname, '../templates/workflowsteps/js'),
      config,
    )

    const { data: apiOp } = await publishService.publishOpToAPI(
      glueCodeOp,
      version,
      teamID,
      accessToken,
      featherClient,
      true,
    )

    const registryAuth = await registryAuthService
      .create(
        accessToken,
        teamName,
        glueCodeOp.name,
        version,
        false,
        true, // pushAccess is true as its publish
      )
      .catch(err => {
        throw new CouldNotGetRegistryToken(err)
      })

    await publishService.publishOpToRegistry(
      apiOp,
      registryAuth,
      teamName,
      accessToken,
      registryAuthService,
      version,
    )

    return `ops run ${opName}`
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
