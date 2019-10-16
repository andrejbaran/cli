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
  OpsYml,
} from '~/types'

import {
  APIError,
  MissingRequiredArgument,
  InvalidOpName,
  NoOpsFound,
  UnauthorizedtoAccessOp,
} from '~/errors/CustomErrors'

import {
  OP_FILE,
  WORKFLOW_ENDPOINT,
  COMMAND_ENDPOINT,
  WORKFLOW_TYPE,
} from '~/constants/opConfig'
import { OPS_REGISTRY_HOST } from '~/constants/env'
import { asyncPipe, _trace, parseYaml } from '~/utils'
import { isValidTeamName, isValidOpName } from '~/utils/validate'
import { OpsGetResponse } from '~/types/OpsGetResponse'

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
  teamName: string
  opName: string
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

  opsAndWorkflows: (Op | Workflow)[] = []

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
    const pathToOpsYml = path.join(path.resolve(nameOrPath), OP_FILE)
    return fs.existsSync(pathToOpsYml)
  }

  parseYamlFile = async (
    relativePathToOpsYml: string,
  ): Promise<OpsYml | null> => {
    const opsYmlExists = this.checkPathOpsYmlExists(relativePathToOpsYml)

    if (!opsYmlExists) {
      return null
    }

    const opsYml = await fs.readFile(
      path.join(path.resolve(relativePathToOpsYml), OP_FILE),
      'utf8',
    )
    const { ops = [], workflows = [], version = '1' } = (await parseYaml(
      opsYml,
    )) as OpsYml
    return { ops, workflows, version }
  }

  /* get all the commands and workflows in an ops.yml that match the nameOrPath */
  getOpsAndWorkflowsFromFileSystem = (relativePathToOpsYml: string) => async (
    inputs: RunInputs,
  ): Promise<RunInputs> => {
    const yamlContents = await this.parseYamlFile(relativePathToOpsYml)

    if (!yamlContents) {
      return { ...inputs }
    }
    const { ops, workflows, version } = yamlContents

    return { ...inputs, opsAndWorkflows: [...ops, ...workflows], version }
  }

  filterLocalOps = (inputs: RunInputs): RunInputs => {
    const { opsAndWorkflows } = inputs

    if (!opsAndWorkflows) {
      return { ...inputs }
    }

    const {
      parsedArgs: {
        args: { nameOrPath },
      },
    } = inputs

    const keepOnlyMatchingNames = ({ name }: Op | Workflow) => {
      return name.indexOf(nameOrPath) >= 0
    }

    return {
      ...inputs,
      opsAndWorkflows: opsAndWorkflows.filter(keepOnlyMatchingNames),
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

  selectOpOrWorkflowToRun = async (inputs: RunInputs): Promise<RunInputs> => {
    try {
      const { opsAndWorkflows } = inputs
      if (!opsAndWorkflows || !opsAndWorkflows.length) throw new InvalidOpName()
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

  printCustomHelp = (op: Op) => {
    try {
      if (!op.help) {
        throw new Error('Custom help message can be defined in the ops.yml\n')
      }

      switch (true) {
        case Boolean(op.description):
          this.log(`\n${op.description}`)
        case Boolean(op.help.usage):
          this.log(`\n${bold('USAGE')}`)
          this.log(`  ${op.help.usage}`)
        case Boolean(op.help.arguments):
          this.log(`\n${bold('ARGUMENTS')}`)
          Object.keys(op.help.arguments).forEach(a => {
            this.log(`  ${a} ${dim(op.help.arguments[a])}`)
          })
        case Boolean(op.help.options):
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

  executeOpOrWorkflowService = async (
    inputs: RunInputs,
  ): Promise<RunInputs> => {
    try {
      let {
        opOrWorkflow,
        config,
        parsedArgs,
        parsedArgs: { opParams },
        teamName,
        version,
      } = inputs
      if (opOrWorkflow.type === WORKFLOW_TYPE) {
        await this.services.workflowService.run(opOrWorkflow, opParams, config)
      } else {
        if (!opOrWorkflow.isPublished) {
          opOrWorkflow = {
            ...opOrWorkflow,
            isPublished: false,
            teamName: opOrWorkflow.teamName || teamName,
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

  /**
   * Extracts the Op Team and Name from the input argument
   * @cto.ai/github -> { teamName: cto.ai, opname: github }
   * cto.ai/github -> { teamName: cto.ai, opname: github }
   * github -> { teamName: '', opname: github }
   * cto.ai/extra/blah -> InvalidOpName
   * null -> InvalidOpName
   */
  parseTeamAndOpName = (inputs: RunInputs) => {
    const {
      parsedArgs: {
        args: { nameOrPath },
      },
      config: {
        team: { name: configTeamName },
      },
    } = inputs

    const splits = nameOrPath.split('/')
    if (splits.length === 0 || splits.length > 2) throw new InvalidOpName()
    if (splits.length === 1) {
      let [opName] = splits
      opName = isValidOpName(splits[0]) ? splits[0] : ''
      return { ...inputs, teamName: configTeamName, opName }
    }
    let [teamName, opName] = splits
    teamName = teamName.startsWith('@')
      ? teamName.substring(1, teamName.length)
      : teamName
    teamName = isValidTeamName(teamName) ? teamName : ''
    opName = isValidOpName(opName) ? opName : ''
    return { ...inputs, teamName, opName }
  }

  getApiOps = async (inputs: RunInputs): Promise<RunInputs> => {
    let {
      config,
      teamName,
      opName,
      opsAndWorkflows: previousOpsAndWorkflows = [],
    } = inputs
    let apiOp
    try {
      if (!opName) return { ...inputs }
      teamName = teamName ? teamName : config.team.name
      ;({ data: apiOp } = await this.services.api.find(
        `teams/${teamName}/ops/${opName}`,
        {
          headers: {
            Authorization: this.accessToken,
          },
        },
      ))
    } catch (err) {
      this.debug('%O', err)
      if (err.error[0].code === 4011) {
        throw new UnauthorizedtoAccessOp(err)
      }
      throw new APIError(err)
    }
    if (!apiOp) {
      throw new NoOpsFound(opName)
    }
    apiOp.isPublished = true
    return {
      ...inputs,
      opsAndWorkflows: [...previousOpsAndWorkflows, apiOp],
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
        /* The nameOrPath argument is a directory containing an ops.yml */
        const runFsPipeline = asyncPipe(
          this.getOpsAndWorkflowsFromFileSystem(nameOrPath),
          this.selectOpOrWorkflowToRun,
          this.checkForHelpMessage,
          this.sendAnalytics,
          this.executeOpOrWorkflowService,
        )
        await runFsPipeline({ parsedArgs, config })
      } else {
        /*
         * nameOrPath is either the name of an op and not a directory, or a
         * directory which does not contain an ops.yml.
         */
        const runApiPipeline = asyncPipe(
          this.getOpsAndWorkflowsFromFileSystem(process.cwd()),
          this.filterLocalOps,
          this.parseTeamAndOpName,
          this.getApiOps,
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
