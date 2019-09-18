import { ux } from '@cto.ai/sdk'
import Docker from 'dockerode'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as yaml from 'yaml'
import Command, { flags } from '../base'
import { OPS_REGISTRY_HOST } from '../constants/env'
import {
  COMMAND,
  OP_FILE,
  WORKFLOW,
  WORKFLOW_ENDPOINT,
} from '../constants/opConfig'
import {
  CouldNotCreateWorkflow,
  FileNotFoundError,
  InvalidInputCharacter,
  InvalidStepsFound,
  NoOpsFound,
  NoWorkflowsFound,
  DockerPublishNoImageFound,
  CouldNotGetRegistryToken,
} from '../errors/CustomErrors'
import {
  Container,
  Op,
  OpsYml,
  SourceResult,
  Workflow,
  RegistryAuth,
} from '../types'
import { asyncPipe } from '../utils/asyncPipe'
import getDocker from '../utils/get-docker'
import { isValidOpName } from '../utils/validate'

export interface PublishInputs {
  opPath: string
  docker: Docker
  opsAndWorkflows: string
  version: string
  ops: Op[]
  workflows: Workflow[]
}

export default class Publish extends Command {
  public static description = 'Publish an op to a team.'

  public static flags = {
    help: flags.help({ char: 'h' }),
  }

  public static args = [
    {
      name: 'path',
      description: 'Path to the op you want to publish.',
      required: true,
    },
  ]

  public docker: Docker | undefined

  public resolvePath = async (opPath: string) => {
    return path.resolve(process.cwd(), opPath)
  }

  public checkDocker = async (opPath: string) => {
    const docker = await getDocker(this, 'publish')
    if (!docker) {
      throw new Error('No docker')
    }
    return { opPath, docker }
  }

  public determineQuestions = async (inputs: PublishInputs) => {
    const { opsAndWorkflows } = await ux.prompt<{
      opsAndWorkflows: SourceResult
    }>({
      type: 'list',
      name: 'opsAndWorkflows',
      message: `\n Which would you like to publish ${ux.colors.reset.green(
        '→',
      )}`,
      choices: [
        { name: 'Commands', value: COMMAND },
        { name: 'Workflows', value: WORKFLOW },
        'Both',
      ],
      afterMessage: `${ux.colors.reset.green('✓')}`,
    })
    return { ...inputs, opsAndWorkflows }
  }

  public getOpsAndWorkFlows = async ({
    opPath,
    opsAndWorkflows,
    docker,
  }: PublishInputs) => {
    const manifest = await fs
      .readFile(path.join(opPath, OP_FILE), 'utf8')
      .catch((err: any) => {
        this.debug('%O', err)
        throw new FileNotFoundError(err, opPath, OP_FILE)
      })

    const { ops, version, workflows }: OpsYml = manifest && yaml.parse(manifest)
    if (!ops && (opsAndWorkflows === COMMAND || opsAndWorkflows === 'Both')) {
      throw new NoOpsFound()
    }
    if (
      !workflows &&
      (opsAndWorkflows === WORKFLOW || opsAndWorkflows === 'Both')
    ) {
      throw new NoWorkflowsFound()
    }
    return { ops, workflows, docker, version, opsAndWorkflows }
  }

  public selectOpsAndWorkFlows = async ({
    ops,
    workflows,
    version,
    docker,
    opsAndWorkflows,
  }: PublishInputs) => {
    switch (opsAndWorkflows) {
      case COMMAND:
        ops = await this.selectOps(ops)
        break
      case WORKFLOW:
        workflows = await this.selectWorkflows(workflows)
        break
      default:
        ops = await this.selectOps(ops)
        workflows = await this.selectWorkflows(workflows)
    }
    return { ops, workflows, version, docker, opsAndWorkflows }
  }

  public selectOps = async (ops: Op[]) => {
    if (ops.length <= 1) {
      return ops
    }
    const answers = await ux.prompt<Container<Op[]>>({
      type: 'checkbox',
      name: 'ops',
      message: `\n Which ops would you like to publish ${ux.colors.reset.green(
        '→',
      )}`,
      choices: ops.map(op => {
        return {
          value: op,
          name: `${op.name} - ${op.description}`,
        }
      }),
      validate: input => input.length > 0,
    })
    return answers.ops
  }

  public selectWorkflows = async (workflows: Workflow[]) => {
    if (workflows.length <= 1) {
      return workflows
    }
    const answers = await ux.prompt<Container<Workflow[]>>({
      type: 'checkbox',
      name: 'workflows',
      message: `\n Which workflows would you like to publish ${ux.colors.reset.green(
        '→',
      )}`,
      choices: workflows.map(workflow => {
        return {
          value: workflow,
          name: `${workflow.name} - ${workflow.description}`,
        }
      }),
      validate: input => input.length > 0,
    })
    return answers.workflows
  }

  getRegistryAuth = async (name, version): Promise<RegistryAuth> => {
    try {
      const registryAuth = await this.services.registryAuthService.create(
        this.accessToken,
        this.team.name,
        name,
        version,
        false,
        true, // pushAccess is true as its publish
      )

      return registryAuth
    } catch (err) {
      throw new CouldNotGetRegistryToken(err)
    }
  }

  public publishOpsAndWorkflows = async (inputs: PublishInputs) => {
    switch (inputs.opsAndWorkflows) {
      case COMMAND:
        await this.opsPublishLoop(inputs)
        break
      case WORKFLOW:
        await this.workflowsPublishLoop(inputs)
        break
      default:
        await this.opsPublishLoop(inputs)
        await this.workflowsPublishLoop(inputs)
    }
  }

  public opsPublishLoop = async ({ ops, version }: PublishInputs) => {
    for (const op of ops) {
      if (!isValidOpName(op)) {
        throw new InvalidInputCharacter('Op Name')
      }

      const localImage = await this.services.imageService.checkLocalImage(
        `${OPS_REGISTRY_HOST}/${this.team.name}/${op.name}:latest`,
      )

      if (!localImage) {
        throw new DockerPublishNoImageFound(op.name, this.team.name)
      }

      const {
        data: apiOp,
      }: { data: Op } = await this.services.publishService.publishOpToAPI(
        op,
        version,
        this.team.id,
        this.accessToken,
        this.services.api,
      )

      // TODO: Setting version as 'platform version' for now
      // but it has to be changed to op.version when versioning is added
      const registryAuth = await this.getRegistryAuth(op.name, version)

      await this.services.publishService.publishOpToRegistry(
        apiOp,
        registryAuth,
        this.team.name,
      )

      // delete registry token
      await this.services.registryAuthService.delete(
        this.accessToken,
        registryAuth.robotID,
        this.team.name,
        op.name,
        version, // TODO: Change to op.version
      )

      this.sendAnalytics('op', apiOp)
    }
  }

  public workflowsPublishLoop = async ({
    workflows,
    version,
  }: PublishInputs) => {
    for (const workflow of workflows) {
      // TODO: Setting version as 'platform version' for now
      // but it has to be changed to workflow.version when versioning is added
      const registryAuth = await this.getRegistryAuth(workflow.name, version)

      if (workflow.remote) {
        const newSteps: string[] = []
        for (const step of workflow.steps) {
          let newStep = ''

          if (await this.services.buildStepService.isGlueCode(step)) {
            const opPath = path.resolve(
              __dirname,
              './../templates/workflowsteps/js/',
            )

            newStep = await this.services.buildStepService.buildAndPublishGlueCode(
              step,
              this.team.id,
              this.team.name,
              this.accessToken,
              opPath,
              this.user,
              this.services.publishService,
              this.services.opService,
              this.services.api,
              registryAuth,
              this.state.config,
            )
          }

          if (!this.services.buildStepService.isOpRun(newStep)) {
            this.debug('InvalidStepsFound - Step:', newStep)
            throw new InvalidStepsFound(newStep)
          }

          newSteps.push(newStep)
        }

        workflow.steps = newSteps
      }

      // delete registry token
      await this.services.registryAuthService.delete(
        this.accessToken,
        registryAuth.robotID,
        this.team.name,
        workflow.name,
        version, // TODO: Change to workflow.version when versioning is added
      )

      try {
        const {
          data: apiWorkflow,
        }: { data: Op } = await this.services.api.create(
          WORKFLOW_ENDPOINT,
          { ...workflow, version, teamID: this.team.id },
          {
            headers: {
              Authorization: this.accessToken,
            },
          },
        )

        this.log(
          `\n🙌 ${ux.colors.callOutCyan(
            apiWorkflow.name,
          )} has been published! \n`,
        )
        // this.sendAnalytics('workflow', apiWorkflow)
      } catch (err) {
        this.debug('%O', err)
        throw new CouldNotCreateWorkflow(err.message)
      }
    }
  }

  public sendAnalytics = async (
    publishType: string,
    opOrWorkflow: Op | Workflow,
  ) => {
    this.services.analytics.track({
      userId: this.user.email,
      event: 'Ops CLI Publish',
      properties: {
        email: this.user.email,
        username: this.user.username,
        type: publishType,
        name: opOrWorkflow.name,
        description: opOrWorkflow.description,
        image: `${OPS_REGISTRY_HOST}/${opOrWorkflow.id.toLowerCase()}`,
        tag: 'latest',
      },
    })
  }

  public async run() {
    try {
      await this.isLoggedIn()
      const { args } = this.parse(Publish)

      const publishPipeline = asyncPipe(
        this.resolvePath,
        this.checkDocker,
        this.determineQuestions,
        this.getOpsAndWorkFlows,
        this.selectOpsAndWorkFlows,
        this.publishOpsAndWorkflows,
      )
      await publishPipeline(args.path)
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
