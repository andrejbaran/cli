import { ux } from '@cto.ai/sdk'
import Docker from 'dockerode'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as yaml from 'yaml'
import Command, { flags } from '../base'
import { OPS_REGISTRY_HOST, OPS_API_HOST } from '../constants/env'
import {
  COMMAND,
  OP_FILE,
  WORKFLOW,
  WORKFLOW_ENDPOINT,
  COMMAND_TYPE,
} from '../constants/opConfig'
import {
  CouldNotCreateWorkflow,
  FileNotFoundError,
  InvalidInputCharacter,
  InvalidStepsFound,
  NoLocalOpsFound,
  NoWorkflowsFound,
  DockerPublishNoImageFound,
  CouldNotGetRegistryToken,
  InvalidWorkflowStep,
  InvalidOpVersionFormat,
  VersionIsTaken,
  APIError,
} from '../errors/CustomErrors'
import {
  Container,
  Op,
  OpsYml,
  SourceResult,
  Workflow,
  RegistryAuth,
} from '../types'
import { asyncPipe, getOpImageTag, parseYaml } from '../utils'
import getDocker from '../utils/get-docker'
import { isValidOpName, isValidOpVersion } from '../utils/validate'
import { ErrorTemplate } from '~/errors/ErrorTemplate'

export interface PublishInputs {
  opPath: string
  docker: Docker
  opsAndWorkflows: string
  version: string
  ops: Op[]
  workflows: Workflow[]
}

export default class Publish extends Command {
  static description = 'Publish an Op to your team.'

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
    if (!docker) {
      throw new Error('No docker')
    }
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
        { name: 'Commands', value: COMMAND },
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

    if (!manifest) throw new NoLocalOpsFound()
    const { ops, version, workflows }: OpsYml = parseYaml(manifest)
    if (!ops && (opsAndWorkflows === COMMAND || opsAndWorkflows === 'Both')) {
      throw new NoLocalOpsFound()
    }
    if (
      !workflows &&
      (opsAndWorkflows === WORKFLOW || opsAndWorkflows === 'Both')
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

  selectOps = async (ops: Op[]) => {
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

  selectWorkflows = async (workflows: Workflow[]) => {
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

  getRegistryAuth = async (
    name: string,
    version: string,
  ): Promise<RegistryAuth> => {
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

  publishOpsAndWorkflows = async (inputs: PublishInputs) => {
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

  opsPublishLoop = async ({ ops, version }: PublishInputs) => {
    try {
      for (const op of ops) {
        if (!isValidOpName(op.name)) {
          throw new InvalidInputCharacter('Op Name')
        }
        if (!isValidOpVersion(op)) {
          throw new InvalidOpVersionFormat()
        }
        const { publishDescription } = await this.ux.prompt({
          type: 'input',
          name: 'publishDescription',
          message: `\nProvide a changelog of what's new for ${op.name}:${
            op.version
          } ${ux.colors.reset.green('→')}\n\n ${ux.colors.white('Changelog:')}`,
          afterMessage: ux.colors.reset.green('✓'),
          afterMessageAppend: ux.colors.reset(' added!'),
          validate: this._validateDescription,
        })
        op.publishDescription = publishDescription
        const opName = getOpImageTag(
          this.team.name,
          op.name,
          op.version,
          op.isPublic,
        )
        const localImage = await this.services.imageService.checkLocalImage(
          `${OPS_REGISTRY_HOST}/${opName}`,
        )

        if (!localImage) {
          throw new DockerPublishNoImageFound(op.name, this.team.name)
        }
        if ('run' in op) {
          op.type = COMMAND_TYPE
          const {
            data: apiOp,
          }: { data: Op } = await this.services.publishService.publishOpToAPI(
            op,
            version,
            this.team.name,
            this.accessToken,
            this.services.api,
          )

          const registryAuth = await this.getRegistryAuth(op.name, op.version)

          await this.services.publishService.publishOpToRegistry(
            apiOp,
            registryAuth,
            this.team.name,
            this.accessToken,
            this.services.registryAuthService,
            this.services.api,
            version,
          )

          this.sendAnalytics('op', apiOp)
        }
      }
    } catch (err) {
      if (err instanceof ErrorTemplate) {
        throw err
      }
      throw new APIError(err)
      4
    }
  }

  workflowsPublishLoop = async ({ workflows, version }: PublishInputs) => {
    try {
      for (const workflow of workflows) {
        if (!isValidOpName(workflow.name)) {
          throw new InvalidInputCharacter('Workflow Name')
        }
        if (!isValidOpVersion(workflow)) {
          throw new InvalidOpVersionFormat()
        }

        const { publishDescription } = await this.ux.prompt({
          type: 'input',
          name: 'publishDescription',
          message: `\nProvide a publish description for ${workflow.name}:${
            workflow.version
          } ${ux.colors.reset.green('→')}\n\n ${ux.colors.white(
            'Description:',
          )}`,
          afterMessage: ux.colors.reset.green('✓'),
          afterMessageAppend: ux.colors.reset(' added!'),
          validate: this._validateDescription,
        })
        workflow.publishDescription = publishDescription

        if ('remote' in workflow && workflow.remote) {
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
                this.services.registryAuthService,
                this.state.config,
                workflow.isPublic,
                version,
              )

              newSteps.push(newStep)
            } else {
              if (!this.services.buildStepService.isOpRun(step)) {
                this.debug('InvalidStepsFound - Step:', step)
                throw new InvalidStepsFound(step)
              }

              newSteps.push(step)
            }
          }

          workflow.steps = newSteps
        }

        try {
          const {
            data: apiWorkflow,
          }: { data: Op } = await this.services.api.create(
            `/teams/${this.team.name}/ops`,
            { ...workflow, platformVersion: version, type: 'workflow' },
            {
              headers: {
                Authorization: this.accessToken,
              },
            },
          )

          this.log(
            `\n🙌 ${ux.colors.callOutCyan(
              apiWorkflow.name,
            )} has been published!`,
          )

          this.log(
            `🖥  Visit your Op page here: ${ux.url(
              `${OPS_API_HOST}registry/${this.team.name}/${apiWorkflow.name}`,
              `<${OPS_API_HOST}${this.team.name}/${apiWorkflow.name}>`,
            )}\n`,
          )
          this.sendAnalytics('workflow', apiWorkflow)
        } catch (err) {
          this.debug('%O', err)
          const InvalidWorkflowStepCodes = [400, 404]
          if (
            err &&
            err.error &&
            err.error[0] &&
            InvalidWorkflowStepCodes.includes(err.error[0].code)
          ) {
            if (err.error[0].message === 'version is taken') {
              throw new VersionIsTaken()
            }
            throw new InvalidWorkflowStep(err)
          }
          throw new CouldNotCreateWorkflow(err.message)
        }
      }
    } catch (err) {
      if (err instanceof ErrorTemplate) throw err
      throw new APIError(err)
    }
  }

  sendAnalytics = async (publishType: string, opOrWorkflow: Op | Workflow) => {
    await this.services.analytics.track({
      userId: this.user.email,
      teamId: this.team.id,
      cliEvent: 'Ops CLI Publish',
      event: 'Ops CLI Publish',
      properties: {
        email: this.user.email,
        username: this.user.username,
        type: publishType,
        name: opOrWorkflow.name,
        description: opOrWorkflow.description,
        image: `${OPS_REGISTRY_HOST}/${opOrWorkflow.id.toLowerCase()}:${
          opOrWorkflow.version
        }`,
        tag: 'latest',
      },
    })
  }

  _validateDescription(input: string) {
    if (input === '')
      return 'You need to provide a publish description of your op before continuing'
    return true
  }

  async run() {
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
