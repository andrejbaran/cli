import * as fs from 'fs-extra'
import * as path from 'path'
import * as yaml from 'yaml'
import { ux } from '@cto.ai/sdk'
import Docker from 'dockerode'
import { asyncPipe } from '~/utils/asyncPipe'
import Command, { flags } from '../base'
import { OPS_REGISTRY_HOST } from '../constants/env'
import { OP_FILE } from '../constants/opConfig'
import {
  Container,
  Op,
  Workflow,
  RegistryAuth,
  OpsYml,
  SourceResult,
} from '../types'
import {
  CouldNotCreateOp,
  CouldNotCreateWorkflow,
  DockerPublishNoImageFound,
  FileNotFoundError,
  InvalidInputCharacter,
  NoOpsFound,
  NoWorkflowsFound,
} from '../errors/customErrors'
import { WORKFLOW, OP } from '~/constants/opConfig'
import { isValidOpName } from '../utils/validate'
import getDocker from '~/utils/get-docker'

interface PublishInputs {
  opPath: string
  docker: Docker
  opsAndWorkflows: string
  version: string
  ops: Op[]
  workflows: Workflow[]
  registryAuth: RegistryAuth
}

export default class Publish extends Command {
  static description = 'Publish an op to a team.'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = [
    {
      name: 'path',
      description: 'Path to the op you want to publish.',
      required: true,
    },
  ]

  docker: Docker | undefined

  resolvePath = async (opPath: string) => {
    return path.resolve(process.cwd(), opPath)
  }

  checkDocker = async (opPath: string) => {
    const docker = await getDocker(this, 'publish')
    if (!docker) throw new Error('No docker')
    return { opPath, docker }
  }

  determineQuestions = async (inputs: PublishInputs) => {
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

  getOpsAndWorkFlows = async ({
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

    let { ops, version, workflows }: OpsYml = manifest && yaml.parse(manifest)
    if (!ops && (opsAndWorkflows == OP || opsAndWorkflows == 'Both')) {
      throw new NoOpsFound()
    }
    if (
      !workflows &&
      (opsAndWorkflows == WORKFLOW || opsAndWorkflows == 'Both')
    ) {
      throw new NoWorkflowsFound()
    }
    return { ops, workflows, docker, version, opsAndWorkflows }
  }

  selectOpsAndWorkFlows = async ({
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

  selectOps = async (ops: Op[]) => {
    if (ops.length <= 1) return ops
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

  selectWorkflows = async (workflows: Workflow[]) => {
    if (workflows.length <= 1) return workflows
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

  checkRegistryAuth = async (inputs: PublishInputs) => {
    const registryAuth: RegistryAuth | undefined = await this.getRegistryAuth(
      this.accessToken,
      this.team.name,
    )
    if (!registryAuth) {
      throw new Error('could not get registry auth')
    }
    return { ...inputs, registryAuth }
  }

  publishOpsAndWorkflows = async (inputs: PublishInputs) => {
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

  opsPublishLoop = async ({
    ops,
    registryAuth,
    docker,
    version,
  }: PublishInputs) => {
    for (let op of ops) {
      if (!isValidOpName(op)) throw new InvalidInputCharacter('Op Name')

      await this.checkLocalImage(op, docker)
      const { data: apiOp }: { data: Op } = await this.publishOp(op, version)

      await this.config.runHook('publish', {
        apiOp,
        registryAuth,
      })
      this.sendAnalytics('op', apiOp)
    }
  }

  checkLocalImage = async (op: Op, docker: Docker) => {
    const list: Docker.ImageInfo[] = await docker.listImages()
    const repo = `${OPS_REGISTRY_HOST}/${this.team.name}/${op.name}:latest`

    const localImage = list
      .map(this.imageFilterPredicate(repo))
      .find((repoTag: string) => !!repoTag)
    if (!localImage) {
      throw new DockerPublishNoImageFound(op.name, this.team.name)
    }
  }
  imageFilterPredicate = (repo: string) => ({ RepoTags }: Docker.ImageInfo) => {
    if (!RepoTags) return
    return RepoTags.find((repoTag: string) => repoTag.includes(repo))
  }

  publishOp = async (op: Op, version: string) => {
    try {
      return this.api.create(
        'ops',
        { ...op, version, teamID: this.team.id },
        {
          headers: {
            Authorization: this.accessToken,
          },
        },
      )
    } catch (err) {
      this.debug('%O', err)
      throw new CouldNotCreateOp(err.message)
    }
  }

  workflowsPublishLoop = async ({ workflows, version }: PublishInputs) => {
    for (let workflow of workflows) {
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
        this.sendAnalytics('workflow', apiWorkflow)
      } catch (err) {
        this.debug('%O', err)
        throw new CouldNotCreateWorkflow(err.message)
      }
    }
  }

  sendAnalytics = async (publishType: string, opOrWorkflow: Op | Workflow) => {
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

  async run() {
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
