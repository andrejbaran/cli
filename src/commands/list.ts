import fuzzy from 'fuzzy'
import Command, { flags } from '../base'
import * as fs from 'fs-extra'
import * as path from 'path'
import { Op, Workflow, Answers, Fuzzy, OpsYml, ListInputs } from '~/types'
import { APIError } from '~/errors/CustomErrors'
import { WORKFLOW_TYPE, OP_FILE } from '../constants/opConfig'
import { asyncPipe, parseYaml } from '~/utils'

export default class List extends Command {
  static description = 'Lists the Ops you have in your team.'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  opResults: (Op | Workflow)[] = []

  getApiOps = async (inputs: ListInputs): Promise<ListInputs> => {
    try {
      const { data: opResults } = await this.services.api.find(
        `teams/${this.state.config.team.name}/ops`,
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

      const { workflows = [], ops = [] }: OpsYml = parseYaml(manifest)

      const localWorkflows = workflows.map(workflow => ({
        ...workflow,
        local: true,
      }))
      const localCommands = ops.map(ops => ({ ...ops, local: true }))
      return {
        ...inputs,
        opResults: [...inputs.opResults, ...localWorkflows, ...localCommands],
      }
    } catch {
      return { ...inputs }
    }
  }

  filterOutGlueCodes = (inputs: ListInputs): ListInputs => {
    const opResults = inputs.opResults.filter(
      input => input.type !== 'glue_code',
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

    const { selectedOp } = await this.ux.prompt<{ selectedOp: Op | Workflow }>({
      type: 'autocomplete',
      name: 'selectedOp',
      pageSize: 5,
      message: `\nSelect a ${this.ux.colors.multiBlue(
        '\u2022Command',
      )} or ${this.ux.colors.multiOrange(
        '\u2022Workflow',
      )} to run ${this.ux.colors.reset.green('→')}\n${this.ux.colors.reset.dim(
        '🌎 = Public 🔑 = Private 🖥  = Local  🔍 Search:',
      )} `,
      source: this._autocompleteSearch.bind(this),
      bottomContent: `\n \n${this.ux.colors.white(
        `Or, run ${this.ux.colors.callOutCyan(
          'ops help',
        )} for usage information.`,
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

  _formatOpOrWorkflowName = (op: Op | Workflow) => {
    const name = this.ux.colors.reset.white(op.name)
    if (op.type === WORKFLOW_TYPE) {
      return `${this.ux.colors.reset(
        this.ux.colors.multiOrange('\u2022'),
      )} ${this._formatOpOrWorkflowEmoji(op)} ${name}`
    } else {
      return `${this.ux.colors.reset(
        this.ux.colors.multiBlue('\u2022'),
      )} ${this._formatOpOrWorkflowEmoji(op)} ${name}`
    }
  }

  _formatOpOrWorkflowEmoji = (opOrWorkflow: Workflow | Op): string => {
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
      selectedOp: { name, local },
    } = inputs
    let runCmd = 'ops run .'
    if (!local) {
      runCmd = `ops run ${name}`
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
    this.services.analytics.track(
      {
        userId: this.user.email,
        teamId: this.team.id,
        cliEvent: 'Ops CLI List',
        event: 'Ops CLI List',
        properties: {
          email: this.user.email,
        },
      },
      this.accessToken,
    )
    return inputs
  }

  async run() {
    try {
      await this.isLoggedIn()

      const listPipeline = asyncPipe(
        this.getApiOps,
        this.getLocalOps,
        this.filterOutGlueCodes,
        this.promptOps,
        this.sendAnalytics,
        this.showRunMessage,
      )

      await listPipeline({})
    } catch (err) {
      this.debug('%0', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
