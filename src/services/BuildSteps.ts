import { IConfig } from '@oclif/config'
import * as fs from 'fs-extra'
import * as path from 'path'
import { Op, RegistryAuth, User } from '../types'
import { SegmentClient } from './Segment'
import { FeathersClient } from './Feathers'
import { Publish } from './Publish'
import { OpService } from './../services/Op'

export class BuildSteps {
  public isGlueCode = async (step: string): Promise<boolean> => {
    if (step === '') {
      return false
    }

    return !this.isOpRun(step)
  }

  public buildAndPublishGlueCode = async (
    step,
    teamID,
    teamName,
    accessToken,
    opPath: string,
    user: User,
    publishService: Publish,
    opService: OpService,
    featherClient: FeathersClient,
    registryAuth: RegistryAuth,
    config: IConfig,
    analytics: SegmentClient,
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
      run: 'node /ops/index.js',
      src: ['Dockerfile', 'index.js', 'package.json', '.dockerignore'],
    }

    const glueCodeClone: Op = JSON.parse(JSON.stringify(glueCodeOp))
    await opService.opsBuildLoop(
      [glueCodeClone],
      '/Users/stevehiehn/cli/src/templates/workflowsteps/js',
      teamName,
      user,
      config,
      analytics,
    )

    const { data: apiOp } = await publishService.publishOpToAPI(
      glueCodeOp,
      '1',
      teamID,
      accessToken,
      featherClient,
    )

    await publishService.publishOpToRegistry(apiOp, registryAuth, teamName)

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
