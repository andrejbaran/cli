import { ux } from '@cto.ai/sdk'
import Docker from 'dockerode'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as yaml from 'yaml'
import Command, { flags } from '../base'
import { OPS_REGISTRY_HOST } from '../constants/env'
import { OP, OP_FILE, WORKFLOW } from '../constants/opConfig'
import {
  CouldNotCreateWorkflow,
  FileNotFoundError,
  InvalidInputCharacter,
  InvalidStepsFound,
  NoOpsFound,
  NoWorkflowsFound,
  DockerPublishNoImageFound,
} from '../errors/CustomErrors'
import {
  Config,
  Container,
  Op,
  OpsYml,
  RegistryAuth,
  SourceResult,
  Workflow,
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
  registryAuth: RegistryAuth
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
        { name: 'Ops', value: OP },
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
    if (!ops && (opsAndWorkflows === OP || opsAndWorkflows === 'Both')) {
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
      case OP:
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

  public checkRegistryAuth = async (inputs: PublishInputs) => {
    const registryAuth: RegistryAuth | undefined = await this.getRegistryAuth(
      this.accessToken,
      this.team.name,
    )
    if (!registryAuth) {
      throw new Error('could not get registry auth')
    }
    return { ...inputs, registryAuth }
  }

  public publishOpsAndWorkflows = async (inputs: PublishInputs) => {
    switch (inputs.opsAndWorkflows) {
      case OP:
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

  public opsPublishLoop = async ({
    ops,
    registryAuth,
    docker,
    version,
  }: PublishInputs) => {
    for (const op of ops) {
      if (!isValidOpName(op)) {
        throw new InvalidInputCharacter('Op Name')
      }

      const localImage = await this.imageService.checkLocalImage(
        `${OPS_REGISTRY_HOST}/${this.team.name}/${op.name}:latest`,
      )

      if (!localImage) {
        throw new DockerPublishNoImageFound(op.name, this.team.name)
      }

      const {
        data: apiOp,
      }: { data: Op } = await this.publishService.publishOpToAPI(
        op,
        version,
        this.team.id,
        this.accessToken,
        this.api,
      )

      await this.publishService.publishOpToRegistry(
        apiOp,
        registryAuth,
        this.team.name,
      )

      this.sendAnalytics('op', apiOp)
    }
  }

  public workflowsPublishLoop = async ({
    workflows,
    version,
  }: PublishInputs) => {
    for (const workflow of workflows) {
      if (workflow.remote) {
        const newSteps: string[] = []
        for (const step of workflow.steps) {
          let newStep = ''

          if (await this.buildStepService.isGlueCode(step)) {
            const registryAuth = await this.getRegistryAuth(
              this.accessToken,
              this.team.name,
            )
            if (registryAuth === undefined) {
              throw new InvalidStepsFound(newStep) // TODO: incorrect error message
            }

            const opPath = path.resolve(
              __dirname,
              './../templates/workflowsteps/js/',
            )

            newStep = await this.buildStepService.buildAndPublishGlueCode(
              step,
              this.team.id,
              this.team.name,
              this.accessToken,
              opPath,
              this.user,
              this.publishService,
              this.opService,
              this.api,
              registryAuth,
              this.config,
              this.analytics,
            )
          }

          if (!this.buildStepService.isOpRun(newStep)) {
            this.debug('InvalidStepsFound - Step:', newStep)
            throw new InvalidStepsFound(newStep)
          }

          newSteps.push(newStep)
        }

        workflow.steps = newSteps
      }

      try {
        const { data: apiWorkflow }: { data: Op } = await this.api.create(
          'workflows',
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
    this.analytics.track({
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
      this.isLoggedIn()
      const { args } = this.parse(Publish)

      const publishPipeline = asyncPipe(
        this.resolvePath,
        this.checkDocker,
        this.determineQuestions,
        this.getOpsAndWorkFlows,
        this.selectOpsAndWorkFlows,
        this.checkRegistryAuth,
        this.publishOpsAndWorkflows,
      )
      await publishPipeline(args.path)
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err })
    }
  }
}
