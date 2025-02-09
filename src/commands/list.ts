import fuzzy from 'fuzzy'
import Command, { flags } from '../base'
import * as fs from 'fs-extra'
import * as path from 'path'
import {
  OpCommand,
  OpWorkflow,
  Answers,
  Fuzzy,
  OpsYml,
  ListInputs,
} from '~/types'
import { APIError } from '~/errors/CustomErrors'
import {
  COMMAND,
  WORKFLOW,
  WORKFLOW_TYPE,
  GLUECODE_TYPE,
  OP_FILE,
} from '../constants/opConfig'
import { pluralize, asyncPipe, parseYaml } from '~/utils'
export default class List extends Command {
  static description = 'Lists the Ops you have in your team.'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  opResults: (OpCommand | OpWorkflow)[] = []

  getApiOps = async (inputs: ListInputs): Promise<ListInputs> => {
    try {
      const { data: opResults } = await this.services.api.find(
        `/private/teams/${inputs.config.team.name}/ops`,
        {
          headers: {
            Authorization: this.accessToken,
          },
        },
      )
      this.opResults = opResults
      return { ...inputs, opResults }
    } catch (err) {
      this.debug('%0', err)
      throw new APIError(err)
    }
  }

  getLocalOps = async (inputs: ListInputs): Promise<ListInputs> => {
    try {
      const manifest = await fs.readFile(
        path.join(process.cwd(), OP_FILE),
        'utf8',
      )
      if (!manifest) return inputs

      const { ops = [] }: OpsYml = parseYaml(manifest)

      const localCommands = ops.map(ops => ({ ...ops, local: true }))
      return {
        ...inputs,
        opResults: [...inputs.opResults, ...localCommands],
      }
    } catch {
      return { ...inputs }
    }
  }

  filterOutWorkflows = (inputs: ListInputs): ListInputs => {
    const opResults = inputs.opResults.filter(
      input => input.type !== WORKFLOW_TYPE,
    )
    this.opResults = opResults
    return { ...inputs, opResults }
  }

  filterOutGlueCodes = (inputs: ListInputs): ListInputs => {
    const opResults = inputs.opResults.filter(
      input => input.type !== GLUECODE_TYPE,
    )
    this.opResults = opResults
    return { ...inputs, opResults }
  }

  promptOps = async (inputs: ListInputs): Promise<ListInputs> => {
    if (inputs.opResults.length == 0) {
      this.log(
        this.ux.colors.whiteBright(
          '❗ Sorry you have no ops yet! If you want help with creating one, please go to: https://cto.ai/docs/getting-started',
        ),
      )
      process.exit()
    }
    const {
      reset,
      multiBlue,
      multiOrange,
      white,
      callOutCyan,
      secondary,
    } = this.ux.colors
    const {
      config: {
        team: { name },
      },
    } = inputs
    const commandText = multiBlue('Command')
    const teamText = secondary(`@${name}`)
    const subHeader = reset.dim(
      '🌎 = Public 🔑 = Private 🖥  = Local  🔍 Search:',
    )
    const { selectedOp } = await this.ux.prompt<{
      selectedOp: OpCommand | OpWorkflow
    }>({
      type: 'autocomplete',
      name: 'selectedOp',
      pageSize: 5,
      message: `\nListing ops for team ${teamText}${callOutCyan(
        `. Select a ${commandText} to continue ${reset.green(
          '→',
        )}\n${subHeader} `,
      )}`,
      source: this._autocompleteSearch.bind(this),
      bottomContent: `\n \n${white(
        `Or, run ${callOutCyan('ops help')} for usage information.`,
      )}`,
    })

    return { ...inputs, selectedOp }
  }

  _autocompleteSearch = async (_: Answers, input = '') => {
    const { list, options } = this._fuzzyFilterParams()
    const fuzzyResult: Fuzzy[] = fuzzy.filter(input, list, options)
    return fuzzyResult.map(result => result.original)
  }

  _fuzzyFilterParams = () => {
    const list = this.opResults.map(op => {
      const name = this._formatOpOrWorkflowName(op)
      return {
        name: `${name} - ${op.description || op.publishDescription}`,
        value: op,
      }
    })
    const options = { extract: el => el.name }
    return { list, options }
  }

  _formatOpOrWorkflowName = (op: OpCommand | OpWorkflow) => {
    const { reset, multiOrange, multiBlue } = this.ux.colors
    const teamName = op.teamName ? `@${op.teamName}/` : ''
    const opVersion = op.version ? `(${op.version})` : ''
    const name = `${reset.white(`${teamName}${op.name}`)} ${reset.dim(
      `${opVersion}`,
    )}`
    if (op.type === WORKFLOW_TYPE) {
      return `${reset(multiOrange('\u2022'))} ${this._formatOpOrWorkflowEmoji(
        op,
      )} ${name}`
    } else {
      return `${reset(multiBlue('\u2022'))} ${this._formatOpOrWorkflowEmoji(
        op,
      )} ${name}`
    }
  }

  _formatOpOrWorkflowEmoji = (opOrWorkflow: OpWorkflow | OpCommand): string => {
    if (opOrWorkflow.local) {
      return '🖥  '
    } else if (opOrWorkflow.isPublic == false) {
      return '🔑 '
    } else {
      return '🌎 '
    }
  }

  showRunMessage = (inputs: ListInputs): ListInputs => {
    const {
      selectedOp: { name, local, version, teamName },
    } = inputs
    let runCmd = 'ops run .'
    if (!local) {
      runCmd = `ops run @${teamName}/${name}:${version}`
    }
    this.log(
      `\n💻 Run ${this.ux.colors.green('$')} ${this.ux.colors.italic.dim(
        runCmd,
      )} to test your op. ${
        local
          ? "(This points to the relative path where the 'ops.yml' file lives)"
          : ''
      }\n`,
    )
    return inputs
  }

  sendAnalytics = async (inputs: ListInputs) => {
    const { config, opResults, selectedOp } = inputs
    this.services.analytics.track(
      'Ops CLI List',
      {
        username: config.user.username,
        results: opResults.length,
        selectedOp: `${selectedOp.teamName}/${selectedOp.name}:${selectedOp.version}`,
      },
      config,
    )
    return inputs
  }
  startSpinner = async (inputs: ListInputs) => {
    await this.ux.spinner.start(
      `🔍 ${this.ux.colors.white('Searching for')} ${this.ux.colors.callOutCyan(
        `all ${pluralize(COMMAND)} and ${pluralize(WORKFLOW)}`,
      )} ${this.ux.colors.white('on your team')}`,
    )
    return inputs
  }

  stopSpinner = async (inputs: ListInputs) => {
    await this.ux.spinner.stop(`${this.ux.colors.successGreen('Done')}`)
    return inputs
  }

  async run() {
    try {
      await this.isLoggedIn()
      const { config } = this.state

      const listPipeline = asyncPipe(
        this.startSpinner,
        this.getApiOps,
        this.getLocalOps,
        this.filterOutWorkflows,
        this.filterOutGlueCodes,
        this.stopSpinner,
        this.promptOps,
        this.sendAnalytics,
        this.showRunMessage,
      )

      await listPipeline({ config })
    } catch (err) {
      this.ux.spinner.stop(`${this.ux.colors.errorRed('Failed')}`)
      this.debug('%0', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
