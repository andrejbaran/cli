import fuzzy from 'fuzzy'
import * as fs from 'fs-extra'
import * as path from 'path'

import Command, { flags } from '~/base'

import {
  Answers,
  OpCommand,
  Fuzzy,
  Config,
  OpWorkflow,
  RunCommandArgs,
  OpsYml,
} from '~/types'

import {
  APIError,
  MissingRequiredArgument,
  InvalidOpName,
  NoOpsFound,
  UnauthorizedtoAccessOp,
  NoTeamFound,
} from '~/errors/CustomErrors'

import { OP_FILE, WORKFLOW_TYPE, COMMAND_TYPE } from '~/constants/opConfig'
import { OPS_REGISTRY_HOST } from '~/constants/env'
import { asyncPipe, _trace, parseYaml } from '~/utils'
import { isValidTeamName, isValidOpName } from '~/utils/validate'

export interface RunInputs {
  parsedArgs: RunCommandArgs
  teamName: string
  opName: string
  opVersion: string
  config: Config
  opsAndWorkflows: (OpCommand | OpWorkflow)[]
  opOrWorkflow: OpCommand | OpWorkflow
}

export default class Run extends Command {
  static description = 'Run an Op from your team or the registry.'

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
    batch: flags.boolean({
      char: 'B',
      description: 'Runs the op in non-interactive batch mode.',
      default: false,
    }),
  }

  // Used to specify variable length arguments
  static strict = false

  static args = [
    {
      name: 'nameOrPath',
      description: 'Name or path of the Op you want to run.',
      parse: (input: string): string => {
        return input.toLowerCase()
      },
    },
  ]

  opsAndWorkflows: (OpCommand | OpWorkflow)[] = []

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

  logResolvedLocalMessage = (inputs: RunInputs): RunInputs => {
    const {
      parsedArgs: {
        args: { nameOrPath },
      },
    } = inputs
    this.log(
      `❗️ ${this.ux.colors.callOutCyan(nameOrPath)} ${this.ux.colors.white(
        'resolved to a local path and is running local Op.',
      )} `,
    )
    return inputs
  }

  /* get all the commands and workflows in an ops.yml that match the nameOrPath */
  getOpsAndWorkflowsFromFileSystem = (relativePathToOpsYml: string) => async (
    inputs: RunInputs,
  ): Promise<RunInputs> => {
    const yamlContents = await this.parseYamlFile(relativePathToOpsYml)

    if (!yamlContents) {
      return { ...inputs, opsAndWorkflows: [] }
    }
    const { ops, workflows } = yamlContents

    return {
      ...inputs,
      opsAndWorkflows: [...ops, ...workflows],
    }
  }

  addMissingApiFieldsToLocalOps = async (
    inputs: RunInputs,
  ): Promise<RunInputs> => {
    const { opsAndWorkflows, config } = inputs
    const updatedOpsAndWorkflows = opsAndWorkflows.map((opOrWorkflow):
      | OpCommand
      | OpWorkflow => {
      let newOpOrWorkflow = { ...opOrWorkflow }
      newOpOrWorkflow.teamName = config.team.name
      newOpOrWorkflow.type =
        'steps' in newOpOrWorkflow ? WORKFLOW_TYPE : COMMAND_TYPE
      return newOpOrWorkflow
    })
    return { ...inputs, opsAndWorkflows: updatedOpsAndWorkflows }
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

    const keepOnlyMatchingNames = ({ name }: OpCommand | OpWorkflow) => {
      return name.indexOf(nameOrPath) >= 0
    }

    return {
      ...inputs,
      opsAndWorkflows: opsAndWorkflows.filter(keepOnlyMatchingNames),
    }
  }

  formatOpOrWorkflowEmoji = (opOrWorkflow: OpWorkflow | OpCommand): string => {
    if (!opOrWorkflow.isPublished) {
      return '🖥  '
    } else if (opOrWorkflow.isPublic) {
      return '🌎 '
    } else {
      return '🔑 '
    }
  }

  formatOpOrWorkflowName = (opOrWorkflow: OpCommand | OpWorkflow) => {
    const name = this.ux.colors.reset.white(opOrWorkflow.name)
    if (
      (!opOrWorkflow.isPublished && 'steps' in opOrWorkflow) ||
      (opOrWorkflow.isPublished && opOrWorkflow.type === WORKFLOW_TYPE)
    ) {
      return `${this.ux.colors.reset(
        this.ux.colors.multiOrange('\u2022'),
      )} ${this.formatOpOrWorkflowEmoji(opOrWorkflow)} ${name}`
    } else {
      return `${this.ux.colors.reset(
        this.ux.colors.multiBlue('\u2022'),
      )} ${this.formatOpOrWorkflowEmoji(opOrWorkflow)} ${name}`
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
      const { opOrWorkflow } = await this.ux.prompt<{
        opOrWorkflow: OpCommand | OpWorkflow
      }>({
        type: 'autocomplete',
        name: 'opOrWorkflow',
        pageSize: 5,
        message: `\nSelect a ${this.ux.colors.multiBlue(
          '\u2022Command',
        )} or ${this.ux.colors.multiOrange(
          '\u2022Workflow',
        )} to run ${this.ux.colors.reset(
          this.ux.colors.green('→'),
        )}\n${this.ux.colors.reset(
          this.ux.colors.dim('🌎 = Public 🔑 = Private 🖥  = Local  🔍 Search:'),
        )} `,
        source: this.autocompleteSearch.bind(this),
      })
      return { ...inputs, opOrWorkflow }
    } catch (err) {
      this.debug('%O', err)
      throw err
    }
  }

  printCustomHelp = (op: OpCommand) => {
    try {
      if (!op.help) {
        throw new Error('Custom help message can be defined in the ops.yml\n')
      }

      switch (true) {
        case Boolean(op.description):
          this.log(`\n${op.description}`)
        case Boolean(op.help.usage):
          this.log(`\n${this.ux.colors.bold('USAGE')}`)
          this.log(`  ${op.help.usage}`)
        case Boolean(op.help.arguments):
          this.log(`\n${this.ux.colors.bold('ARGUMENTS')}`)
          Object.keys(op.help.arguments).forEach(a => {
            this.log(`  ${a} ${this.ux.colors.dim(op.help.arguments[a])}`)
          })
        case Boolean(op.help.options):
          this.log(`\n${this.ux.colors.bold('OPTIONS')}`)
          Object.keys(op.help.options).forEach(o => {
            this.log(
              `  -${o.substring(0, 1)}, --${o} ${this.ux.colors.dim(
                op.help.options[o],
              )}`,
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

  isOpCommand = (op: OpCommand | OpWorkflow): op is OpCommand => {
    return (op as OpCommand).bind !== undefined
  }

  isOpWorkflow = (op: OpCommand | OpWorkflow): op is OpWorkflow => {
    return (op as OpWorkflow).steps !== undefined
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
        opVersion,
        opsAndWorkflows,
      } = inputs

      let allBinds: {
        bind: string[]
        mountHome: boolean
        mountCwd: boolean
      } = { bind: [], mountCwd: false, mountHome: false }

      opsAndWorkflows
        .map(op => {
          if (this.isOpCommand(op)) {
            this.debug(
              'executeOpOrWorkflowService: bindings: checking Op bindings:',
              op.name,
            )
            let { bind, mountHome, mountCwd } = op
            return { bind, mountHome, mountCwd }
          } else if (this.isOpWorkflow(op)) {
            return undefined
          }
        })
        .forEach(opsBinds => {
          this.debug(
            'executeOpOrWorkflowService: bindings: processing bindings',
            opsBinds,
          )
          if (opsBinds) {
            allBinds.mountCwd = allBinds.mountCwd || opsBinds.mountCwd
            allBinds.mountHome = allBinds.mountHome || opsBinds.mountHome
            if (opsBinds.bind) {
              allBinds.bind = allBinds.bind.concat(opsBinds.bind)
            }
          }
        })

      if (allBinds.mountCwd || allBinds.mountHome || allBinds.bind.length > 0) {
        this.debug(
          'executeOpOrWorkflowService: bindings: some bindings found, printing warnings',
        )
        //there's binds
        this.ux.print(
          '⚠️  Warning, the op or workflow you are about to run mounts some directories!',
        )
        if (allBinds.mountCwd) {
          this.ux.print('⚠️  The current working directory will be mounted.')
        }
        if (allBinds.mountHome) {
          this.ux.print('⚠️  The home directory will be mounted.')
        }
        if (allBinds.bind.length > 0) {
          this.ux.print('⚠️  The following directories will be mounted:')
          this.ux.print(
            `   ${allBinds.bind
              .map((value: string) => {
                return value.split(':')[0]
              })
              .join('\n   ')}`,
          )
        }

        this.debug(
          'executeOpOrWorkflowService: bindings: acquiring user consent for filesystem bindings',
        )
        const { bindConsent } = await this.ux.prompt<{
          bindConsent: boolean
        }>({
          type: 'confirm',
          name: 'bindConsent',
          default: 'no',
          message:
            'The Op(s)/Workflow(s) you are about to run is requesting access to your host file system. Are you OK with this?',
        })

        if (!bindConsent) {
          this.debug(
            'executeOpOrWorkflowService: bindings: user denied consent for fs bindings, exiting',
          )
          process.exit(1)
        }
      }

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
          opVersion,
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
   * @cto.ai/github -> { teamName: cto.ai, opname: github, opVersion: '' }
   * cto.ai/github -> { teamName: cto.ai, opname: github, opVersion: '' }
   * github -> { teamName: '', opname: github, opVersion: '' }
   * @cto.ai/github:0.1.0 -> { teamName: cto.ai, opname: github, opVersion: '0.1.0' }
   * cto.ai/github:customVersion -> { teamName: cto.ai, opname: github, opVersion: 'customVersion' }
   * github:myVersion -> { teamName: '', opname: github, opVersion: 'myVersion' }
   * cto.ai/extra/blah -> InvalidOpName
   * cto.ai/extra:version1:version2 -> InvalidOpName
   * null -> InvalidOpName
   */
  parseTeamOpNameVersion = (inputs: RunInputs) => {
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
      let [opNameAndVersion] = splits

      opNameAndVersion = splits[0]

      const { opName, opVersion } = this.parseOpNameAndVersion(opNameAndVersion)
      if (!isValidOpName(opName)) throw new InvalidOpName()
      return { ...inputs, teamName: configTeamName, opName, opVersion }
    }
    let [teamName, opNameAndVersion] = splits
    teamName = teamName.startsWith('@')
      ? teamName.substring(1, teamName.length)
      : teamName
    teamName = isValidTeamName(teamName) ? teamName : ''

    const { opName, opVersion } = this.parseOpNameAndVersion(opNameAndVersion)

    if (!isValidOpName(opName)) throw new InvalidOpName()
    return { ...inputs, teamName, opName, opVersion }
  }

  /**
   * Extracts the version and op name from input argument.
   * github -> { opName: 'github', opVersion: '' }
   * github:0.1.0 -> { opName: 'github', opVersion: '0.1.0' }
   * github:: -> InvalidOpName
   */
  parseOpNameAndVersion = (
    opNameAndVersion: string,
  ): { opName: string; opVersion: string } => {
    const splits = opNameAndVersion.split(':')
    if (splits.length === 0 || splits.length > 2) throw new InvalidOpName()
    if (splits.length === 1) {
      return {
        opName: opNameAndVersion,
        opVersion: '',
      }
    }
    const [opName, opVersion] = splits
    return { opName, opVersion }
  }

  getApiOps = async (inputs: RunInputs): Promise<RunInputs> => {
    let {
      config,
      teamName,
      opName,
      opsAndWorkflows: previousOpsAndWorkflows = [],
      opVersion,
    } = inputs
    let apiOp: OpCommand | OpWorkflow
    try {
      if (!opName) return { ...inputs }
      teamName = teamName ? teamName : config.team.name

      if (opVersion) {
        ;({ data: apiOp } = await this.services.api.find(
          `/private/teams/${teamName}/ops/${opName}/versions/${opVersion}`,
          {
            headers: {
              Authorization: this.accessToken,
            },
          },
        ))
      } else {
        ;({ data: apiOp } = await this.services.api.find(
          `/private/teams/${teamName}/ops/${opName}`,
          {
            headers: {
              Authorization: this.accessToken,
            },
          },
        ))
      }
    } catch (err) {
      this.debug('%O', err)
      if (err.error[0].code === 404) {
        throw new NoOpsFound(`@${teamName}/${opName}:${opVersion}`)
      }
      if (err.error[0].code === 4011) {
        throw new UnauthorizedtoAccessOp(err)
      }
      if (err.error[0].code === 4033) {
        throw new NoTeamFound(teamName)
      }
      throw new APIError(err)
    }
    if (!apiOp && !previousOpsAndWorkflows.length) {
      throw new NoOpsFound(opName, teamName)
    }
    if (!apiOp) {
      return { ...inputs }
    }

    apiOp.isPublished = true
    return {
      ...inputs,
      opsAndWorkflows: [...previousOpsAndWorkflows, apiOp],
    }
  }

  sendAnalytics = async (inputs: RunInputs): Promise<RunInputs> => {
    const {
      opOrWorkflow: { id, name, description, version, teamName },
      parsedArgs: { opParams },
      config,
    } = inputs
    this.services.analytics.track(
      'Ops CLI Run',
      {
        username: config.user.username,
        id,
        name,
        description,
        version,
        team: teamName,
        namespace: `${teamName}/${name}`,
        namespace_version: `${teamName}/${name}:${version}`,
        image: `${OPS_REGISTRY_HOST}/${name}:${version}`,
        argments: opParams.length,
        runtime: 'CLI',
        cliVersion: this.config.version,
      },
      config,
    )
    return inputs
  }

  async run() {
    const config = await this.isLoggedIn()
    try {
      this.ux.spinner.start('initializing')

      const parsedArgs: RunCommandArgs = this.customParse(Run, this.argv)
      //@ts-ignore
      this.ux.spinner.stop()
      const {
        args: { nameOrPath },
      } = parsedArgs

      if (this.checkPathOpsYmlExists(nameOrPath)) {
        /* The nameOrPath argument is a directory containing an ops.yml */
        const runFsPipeline = asyncPipe(
          this.logResolvedLocalMessage,
          this.getOpsAndWorkflowsFromFileSystem(nameOrPath),
          this.addMissingApiFieldsToLocalOps,
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
          this.addMissingApiFieldsToLocalOps,
          this.filterLocalOps,
          this.parseTeamOpNameVersion,
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
      this.config.runHook('error', {
        err,
        accessToken: config.tokens.accessToken,
      })
    }
  }
}
