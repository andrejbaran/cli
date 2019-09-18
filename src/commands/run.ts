import { ux } from '@cto.ai/sdk'
import fuzzy from 'fuzzy'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as yaml from 'yaml'

import Command, { flags } from '~/base'

import {
  Answers,
  Op,
  Fuzzy,
  Config,
  Workflow,
  RunCommandArgs,
  OpsFindQuery,
  OpsFindResponse,
  WorkflowsFindQuery,
  WorkflowsFindResponse,
} from '~/types'

import { APIError, MissingRequiredArgument } from '~/errors/CustomErrors'

import {
  OP_FILE,
  WORKFLOW_ENDPOINT,
  COMMAND_ENDPOINT,
} from '~/constants/opConfig'
import { OPS_REGISTRY_HOST } from '~/constants/env'
import { asyncPipe } from '~/utils'
const { multiBlue, multiOrange, green, dim, reset, bold } = ux.colors

export interface RunCommandArgs {
  args: { nameOrPath: string }
  flags: {
    build?: boolean
    help?: boolean
  }
  opParams: string[]
}

export interface RunInputs {
  parsedArgs: RunCommandArgs
  config: Config
  opsAndWorkflows: (Op | Workflow)[]
  opOrWorkflow: Op | Workflow
  version: string
}

export default class Run extends Command {
  static description = 'Run an op from the registry.'

  static flags = {
    help: flags.boolean({
      char: 'h',
      description: 'show CLI help',
    }),
    build: flags.boolean({
      char: 'b',
      description:
        'Builds the op before running. Must provide a path to the op.',
      default: false,
    }),
  }

  // Used to specify variable length arguments
  static strict = false

  static args = [
    {
      name: 'nameOrPath',
      description: 'Name or path of the op or workflow you want to run.',
    },
  ]

  opsAndWorkflows

  customParse = (options: typeof Run, argv: string[]) => {
    const { args, flags } = require('@oclif/parser').parse(argv, {
      ...options,
      context: this,
    })
    if (!args.nameOrPath && !flags.help) {
      throw new MissingRequiredArgument('ops run')
    }
    if (!args.nameOrPath) this._help()

    return { args, flags, opParams: argv.slice(1) }
  }

  checkPathOpsYmlExists = (nameOrPath: string): boolean => {
    return !!fs.existsSync(path.join(path.resolve(nameOrPath), OP_FILE))
  }

  getOpsAndWorkflowsFromFileSystem = async (inputs): Promise<RunInputs> => {
    try {
      let opsAndWorkflows: (Op | Workflow)[] = []
      const {
        parsedArgs: {
          args: { nameOrPath },
        },
      } = inputs
      const opsYml = await fs.readFile(
        path.join(path.resolve(nameOrPath), OP_FILE),
        'utf8',
      )
      let {
        ops = [],
        workflows = [],
        version,
      }: {
        ops: Op[]
        workflows: Workflow[]
        version: string
      } = await yaml.parse(opsYml)

      if (workflows && workflows.length) opsAndWorkflows = [...workflows]
      if (ops && ops.length) opsAndWorkflows = opsAndWorkflows.concat(ops)
      return { ...inputs, opsAndWorkflows, version }
    } catch (err) {
      this.debug('%O', err)
      throw err
    }
  }

  selectOpOrWorkflowToRun = async (inputs: RunInputs): Promise<RunInputs> => {
    try {
      const { opsAndWorkflows } = inputs
      if (opsAndWorkflows.length === 1) {
        return { ...inputs, opOrWorkflow: opsAndWorkflows[0] }
      }
      this.opsAndWorkflows = opsAndWorkflows
      const { opOrWorkflow } = await ux.prompt<{ opOrWorkflow: Op | Workflow }>(
        {
          type: 'autocomplete',
          name: 'opOrWorkflow',
          pageSize: 5,
          message: `\nSelect a ${multiBlue('\u2022Op')} or ${multiOrange(
            '\u2022Workflow',
          )} to run ${reset(green('→'))}\n${reset(
            dim('🌎 = Public 🔑 = Private 🖥  = Local  🔍 Search:'),
          )} `,
          source: this.autocompleteSearch.bind(this),
        },
      )
      return { ...inputs, opOrWorkflow }
    } catch (err) {
      this.debug('%O', err)
      throw err
    }
  }

  autocompleteSearch = async (_: Answers, input = '') => {
    try {
      const { list, options } = this.fuzzyFilterParams()
      const fuzzyResult: Fuzzy[] = fuzzy.filter(input, list, options)
      return fuzzyResult.map(result => result.original)
    } catch (err) {
      this.debug('%O', err)
      throw err
    }
  }
  fuzzyFilterParams = () => {
    const list = this.opsAndWorkflows.map(opOrWorkflow => {
      const name = this.formatOpOrWorkflowName(opOrWorkflow)
      return {
        name: `${name} - ${opOrWorkflow.description}`,
        value: opOrWorkflow,
      }
    })
    const options = { extract: el => el.name }
    return { list, options }
  }

  formatOpOrWorkflowName = (opOrWorkflow: Op | Workflow) => {
    const name = reset.white(opOrWorkflow.name)
    if ('steps' in opOrWorkflow) {
      return `${reset(multiOrange('\u2022'))} ${this.formatOpOrWorkflowEmoji(
        opOrWorkflow,
      )} ${name}`
    } else {
      return `${reset(multiBlue('\u2022'))} ${this.formatOpOrWorkflowEmoji(
        opOrWorkflow,
      )} ${name}`
    }
  }

  formatOpOrWorkflowEmoji = (opOrWorkflow: Workflow | Op): string => {
    if (opOrWorkflow.teamID == this.team.id) {
      return '🔑 '
    } else if (!opOrWorkflow.isPublished) {
      return '🖥  '
    } else {
      return '🌎 '
    }
  }

  checkForHelpMessage = (inputs: RunInputs): RunInputs | void => {
    try {
      const {
        parsedArgs: {
          flags: { help },
        },
        opOrWorkflow,
      } = inputs
      // TODO add support for workflows help
      if (help && 'run' in opOrWorkflow) {
        this.printCustomHelp(opOrWorkflow)
        process.exit()
      }
      return inputs
    } catch (err) {
      this.debug('%O', err)
      throw err
    }
  }
  printCustomHelp = (op: Op) => {
    try {
      if (!op.help) {
        throw new Error('Custom help message can be defined in the ops.yml\n')
      }

      switch (true) {
        case !!op.description:
          this.log(`\n${op.description}`)
        case !!op.help.usage:
          this.log(`\n${bold('USAGE')}`)
          this.log(`  ${op.help.usage}`)
        case !!op.help.arguments:
          this.log(`\n${bold('ARGUMENTS')}`)
          Object.keys(op.help.arguments).forEach(a => {
            this.log(`  ${a} ${dim(op.help.arguments[a])}`)
          })
        case !!op.help.options:
          this.log(`\n${bold('OPTIONS')}`)
          Object.keys(op.help.options).forEach(o => {
            this.log(
              `  -${o.substring(0, 1)}, --${o} ${dim(op.help.options[o])}`,
            )
          })
      }
    } catch (err) {
      this.debug('%O', err)
      throw err
    }
  }

  executeOpOrWorkflowService = async (
    inputs: RunInputs,
  ): Promise<RunInputs> => {
    try {
      let {
        opOrWorkflow,
        config,
        parsedArgs,
        parsedArgs: { opParams },
        version,
      } = inputs
      if ('steps' in opOrWorkflow) {
        await this.services.workflowService.run(opOrWorkflow, opParams, config)
      } else {
        if (!opOrWorkflow.isPublished) {
          const image = path.join(
            OPS_REGISTRY_HOST,
            `${config.team.name}/${opOrWorkflow.name}`,
          )
          opOrWorkflow = {
            ...opOrWorkflow,
            isPublished: false,
            image,
          }
        }
        await this.services.opService.run(
          opOrWorkflow,
          parsedArgs,
          config,
          version,
        )
      }
      return { ...inputs, opOrWorkflow }
    } catch (err) {
      this.debug('%O', err)
      throw err
    }
  }

  getApiOps = async (inputs: RunInputs): Promise<RunInputs> => {
    const {
      config,
      parsedArgs: {
        args: { nameOrPath },
      },
    } = inputs
    try {
      const query: OpsFindQuery = {
        search: nameOrPath,
        team_id: config.team.id,
      }
      const { data: apiOps }: OpsFindResponse = await this.services.api.find(
        COMMAND_ENDPOINT,
        {
          query,
          headers: {
            Authorization: config.tokens.accessToken,
          },
        },
      )
      const opsAndWorkflows = apiOps.map(op => {
        const isPublic = op.teamID !== config.team.id ? true : false
        return { ...op, isPublished: true, isPublic }
      })
      return { ...inputs, opsAndWorkflows }
    } catch (err) {
      this.debug('%O', err)
      throw new APIError(err)
    }
  }
  getApiWorkflows = async (inputs: RunInputs): Promise<RunInputs> => {
    let {
      config,
      parsedArgs: {
        args: { nameOrPath },
      },
      opsAndWorkflows,
    } = inputs
    try {
      const query: WorkflowsFindQuery = {
        search: nameOrPath,
        teamId: config.team.id,
      }
      let {
        data: apiWorkflows,
      }: WorkflowsFindResponse = await this.services.api.find(
        WORKFLOW_ENDPOINT,
        {
          query,
          headers: {
            Authorization: config.tokens.accessToken,
          },
        },
      )
      apiWorkflows = apiWorkflows.map(workflow => {
        const isPublic = workflow.teamID !== config.team.id ? true : false
        return { ...workflow, isPublished: true, isPublic }
      })
      opsAndWorkflows = opsAndWorkflows.concat(apiWorkflows)
      return { ...inputs, opsAndWorkflows }
    } catch (err) {
      this.debug('error: %O', err)
      throw new APIError(err)
    }
  }

  sendAnalytics = (inputs: RunInputs): RunInputs => {
    const {
      opOrWorkflow: { id, name, description },
      parsedArgs: { opParams },
    } = inputs
    this.services.analytics.track(
      {
        userId: this.user.email,
        event: 'Ops CLI Run',
        properties: {
          email: this.user.email,
          username: this.user.username,
          id,
          name,
          description,
          argments: opParams.length,
          image: `${OPS_REGISTRY_HOST}/${name}`,
        },
      },
      this.accessToken,
    )
    return inputs
  }

  async run() {
    try {
      await this.isLoggedIn()
      const { config } = this.state

      const parsedArgs: RunCommandArgs = this.customParse(Run, this.argv)
      const {
        args: { nameOrPath },
      } = parsedArgs

      if (this.checkPathOpsYmlExists(nameOrPath)) {
        const runFsPipeline = asyncPipe(
          this.getOpsAndWorkflowsFromFileSystem,
          this.selectOpOrWorkflowToRun,
          this.checkForHelpMessage,
          this.sendAnalytics,
          this.executeOpOrWorkflowService,
        )
        await runFsPipeline({ parsedArgs, config })
      } else {
        const runApiPipeline = asyncPipe(
          this.getApiOps,
          this.getApiWorkflows,
          this.selectOpOrWorkflowToRun,
          this.checkForHelpMessage,
          this.sendAnalytics,
          this.executeOpOrWorkflowService,
        )
        await runApiPipeline({ parsedArgs, config })
      }
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
