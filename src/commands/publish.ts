import { ux } from '@cto.ai/sdk'
import Docker from 'dockerode'
import * as fs from 'fs-extra'
import * as path from 'path'
import Command, { flags } from '../base'
import { OPS_REGISTRY_HOST, OPS_API_HOST } from '../constants/env'
import {
  COMMAND,
  OP_FILE,
  WORKFLOW,
  COMMAND_TYPE,
  WORKFLOW_TYPE,
} from '../constants/opConfig'
import {
  CouldNotCreateWorkflow,
  FileNotFoundError,
  InvalidInputCharacter,
  InvalidStepsFound,
  NoLocalOpsFound,
  DockerPublishNoImageFound,
  CouldNotGetRegistryToken,
  InvalidWorkflowStep,
  InvalidOpVersionFormat,
  VersionIsTaken,
  APIError,
  NoLocalOpsOrWorkflowsFound,
} from '../errors/CustomErrors'
import {
  Container,
  OpCommand,
  OpsYml,
  OpWorkflow,
  RegistryAuth,
  Config,
} from '../types'
import { asyncPipe, getOpImageTag, parseYaml, getOpUrl } from '../utils'
import getDocker from '../utils/get-docker'
import {
  isValidOpName,
  isValidOpVersion,
  validVersionChars,
} from '../utils/validate'
import { ErrorTemplate } from '~/errors/ErrorTemplate'

export interface PublishInputs {
  config: Config
  opPath: string
  docker: Docker
  commandsAndWorkflows: string
  version: string
  opCommands: OpCommand[]
  opWorkflows: OpWorkflow[]
  existingVersions: (OpCommand | OpWorkflow)[]
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

  getOpsAndWorkFlows = async (inputs: PublishInputs) => {
    const { opPath } = inputs
    const manifest = await fs
      .readFile(path.join(opPath, OP_FILE), 'utf8')
      .catch((err: any) => {
        this.debug('%O', err)
        throw new FileNotFoundError(err, opPath, OP_FILE)
      })

    if (!manifest) throw new NoLocalOpsFound()
    const { ops, version, workflows }: OpsYml = parseYaml(manifest)
    if (!ops && !workflows) {
      throw new NoLocalOpsOrWorkflowsFound()
    }

    return {
      ...inputs,
      opCommands: ops,
      opWorkflows: workflows,
      version,
    }
  }

  determineQuestions = async (inputs: PublishInputs) => {
    const { opCommands, opWorkflows } = inputs
    let opsAndWorkflows: string
    if (opCommands && opCommands.length && opWorkflows && opWorkflows.length) {
      ;({ opsAndWorkflows } = await ux.prompt<{
        opsAndWorkflows: string
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
      }))
    } else if (!opCommands || !opCommands.length) {
      opsAndWorkflows = WORKFLOW
    } else {
      opsAndWorkflows = COMMAND
    }
    return { ...inputs, commandsAndWorkflows: opsAndWorkflows }
  }

  selectOpsAndWorkFlows = async (inputs: PublishInputs) => {
    let { commandsAndWorkflows, opCommands, opWorkflows } = inputs
    switch (commandsAndWorkflows) {
      case COMMAND:
        opCommands = await this.selectOps(opCommands)
        break
      case WORKFLOW:
        opWorkflows = await this.selectWorkflows(opWorkflows)
        break
      default:
        opCommands = await this.selectOps(opCommands)
        opWorkflows = await this.selectWorkflows(opWorkflows)
    }
    return {
      ...inputs,
      opCommands,
      opWorkflows,
      commandsAndWorkflows,
    }
  }

  selectOps = async (ops: OpCommand[]) => {
    if (ops.length <= 1) {
      return ops
    }
    const answers = await ux.prompt<Container<OpCommand[]>>({
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

  selectWorkflows = async (workflows: OpWorkflow[]) => {
    if (workflows.length <= 1) {
      return workflows
    }
    const answers = await ux.prompt<Container<OpWorkflow[]>>({
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

  findOpsWhereVersionAlreadyExists = async (inputs: PublishInputs) => {
    const {
      existingVersions: existingCommandVersions,
      filteredOps: opCommands,
    } = await this.filterExistingOps(inputs.opCommands)
    const {
      existingVersions: existingWorkflowVersions,
      filteredOps: opWorkflows,
    } = await this.filterExistingOps(inputs.opWorkflows)
    return {
      ...inputs,
      opCommands,
      opWorkflows,
      existingVersions: [
        ...existingCommandVersions,
        ...existingWorkflowVersions,
      ],
    }
  }

  filterExistingOps = async ops => {
    let filteredOps: (OpCommand | OpWorkflow)[] = []
    let existingVersions: (OpCommand | OpWorkflow)[] = []
    for (const op of ops) {
      try {
        await this.services.api.find(
          `/private/teams/${this.team.name}/ops/${op.name}/versions/${op.version}`,
          {
            headers: {
              Authorization: this.accessToken,
            },
          },
        )

        existingVersions = existingVersions.concat(op)
      } catch (err) {
        if (err.error[0].code === 404) {
          filteredOps = filteredOps.concat(op)
          continue
        }
        throw new APIError(err)
      }
    }

    return { existingVersions, filteredOps }
  }

  getNewVersion = async (inputs: PublishInputs) => {
    if (inputs.existingVersions.length === 0) return inputs

    let manifest = await fs.readFile(path.join(inputs.opPath, OP_FILE), 'utf8')
    this.log(
      '\n 🤔 It seems like the version of the op that you are trying to publish already taken. \n   Add a new version indicator in order to publish',
    )
    for (let existingOp of inputs.existingVersions) {
      this.log(
        `${this.ux.colors.callOutCyan(
          `Current version for ${existingOp.name}:`,
        )} ${this.ux.colors.white(existingOp.version)}`,
      )
      const { newVersion } = await this.ux.prompt({
        type: 'input',
        name: 'newVersion',
        message: '\n✍️  Update version:',
        transformer: input => {
          return this.ux.colors.white(input)
        },
        validate: async input => {
          try {
            if (input === '') return 'Please enter a version'
            if (!validVersionChars.test(input)) {
              return '❗ Sorry, version is required and can only contain letters, digits, underscores, \n    periods and dashes and must start and end with a letter or a digit'
            }
            await this.services.api.find(
              `/private/teams/${this.team.name}/ops/${existingOp.name}/versions/${input}`,
              {
                headers: {
                  Authorization: this.accessToken,
                },
              },
            )
            return 'That version is already taken'
          } catch (err) {
            if (err.error[0].code === 404) {
              return true
            }
            throw new APIError(err)
          }
        },
      })
      manifest = manifest.replace(
        `name: ${existingOp.name}:${existingOp.version}`,
        `name: ${existingOp.name}:${newVersion}`,
      )
      existingOp.version = newVersion
      if (existingOp.type === COMMAND_TYPE) {
        inputs.opCommands = inputs.opCommands.concat(existingOp)
        const opImageTag = getOpImageTag(
          this.team.name,
          existingOp.name,
          existingOp.version,
          existingOp.isPublic,
        )
        const image = getOpUrl(OPS_REGISTRY_HOST, opImageTag)
        await this.services.imageService.build(
          image,
          path.resolve(process.cwd(), inputs.opPath),
          existingOp,
        )
      } else if (existingOp.type === WORKFLOW_TYPE) {
        inputs.opWorkflows = inputs.opWorkflows.concat(existingOp)
      }
    }
    fs.writeFileSync(path.join(inputs.opPath, OP_FILE), manifest)
    return { ...inputs }
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

  publishOpsAndWorkflows = (config: Config) => async (
    inputs: PublishInputs,
  ) => {
    inputs = { ...inputs, config }
    switch (inputs.commandsAndWorkflows) {
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

  opsPublishLoop = async ({ opCommands, version, config }: PublishInputs) => {
    try {
      for (const op of opCommands) {
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
          } ${ux.colors.reset.green('→')}\n\n ${ux.colors.white(
            '✍️  Changelog:',
          )}`,
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
        // TODO: What do we do if this isn't true
        if ('run' in op) {
          op.type = COMMAND_TYPE
          const {
            data: apiOp,
          }: {
            data: OpCommand
          } = await this.services.publishService.publishOpToAPI(
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

          this.sendAnalytics('op', apiOp, config)
        }
      }
    } catch (err) {
      if (err instanceof ErrorTemplate) {
        throw err
      }
      throw new APIError(err)
    }
  }

  workflowsPublishLoop = async ({
    opWorkflows,
    version,
    config,
  }: PublishInputs) => {
    try {
      for (const workflow of opWorkflows) {
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
            // TODO disabling gluecode until further planning has been done
            if (
              (await this.services.buildStepService.isGlueCode(step)) &&
              false
            ) {
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
          }: { data: OpCommand } = await this.services.api.create(
            `/private/teams/${this.team.name}/ops`,
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
          this.sendAnalytics('workflow', apiWorkflow, config)
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

  sendAnalytics = (
    publishType: string,
    opOrWorkflow: OpCommand | OpWorkflow,
    config: Config,
  ) => {
    this.services.analytics.track(
      'Ops CLI Publish',
      {
        name: opOrWorkflow.name,
        team: config.team.name,
        namespace: `@${config.team.name}/${opOrWorkflow.name}`,
        username: config.user.username,
        type: publishType,
        description: opOrWorkflow.description,
        image: `${OPS_REGISTRY_HOST}/${opOrWorkflow.id.toLowerCase()}:${
          opOrWorkflow.version
        }`,
        tag: opOrWorkflow.version,
      },
      config,
    )
  }

  _validateDescription(input: string) {
    if (input === '')
      return 'You need to provide a publish description of your op before continuing'
    return true
  }

  async run() {
    const config = await this.isLoggedIn()
    try {
      const { args } = this.parse(Publish)

      const publishPipeline = asyncPipe(
        this.resolvePath,
        this.checkDocker,
        this.getOpsAndWorkFlows,
        this.determineQuestions,
        this.selectOpsAndWorkFlows,
        this.findOpsWhereVersionAlreadyExists,
        this.getNewVersion,
        this.publishOpsAndWorkflows(config),
      )
      await publishPipeline(args.path)
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', {
        err,
        accessToken: config.tokens.accessToken,
      })
    }
  }
}
