import fuzzy from 'fuzzy'
import Command, { flags } from '../base'
import { Op, Workflow, Answers, Fuzzy } from '~/types'
import { APIError } from '~/errors/CustomErrors'
import { WORKFLOW_TYPE } from '../constants/opConfig'
import { asyncPipe } from '~/utils'

interface ListInputs {
  opResults: (Op | Workflow)[]
  selectedOp: Op | Workflow
}

export default class List extends Command {
  static description = 'Lists the ops you have in your team'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  opResults: (Op | Workflow)[] = []

  getOps = async (inputs: ListInputs): Promise<ListInputs> => {
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

  filterOutGlueCodes = (inputs: ListInputs) => {
    try {
      const opResults = inputs.opResults.filter(
        input => input.type !== 'glue_code',
      )
      this.opResults = opResults
      return { ...inputs, opResults }
    } catch (err) {
      this.debug('%0', err)
    }
  }

  promptOps = async (inputs: ListInputs): Promise<ListInputs> => {
    const { selectedOp } = await this.ux.prompt<{ selectedOp: Op | Workflow }>({
      type: 'autocomplete',
      name: 'selectedOp',
      pageSize: 5,
      message: `\nSelect a ${this.ux.colors.multiBlue(
        '\u2022Op',
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
    if (opOrWorkflow.isPublic == false) {
      return '🔑 '
    } else if ('local' in opOrWorkflow) {
      return '🖥  '
    } else {
      return '🌎 '
    }
  }

  showRunMessage = (inputs: ListInputs): ListInputs => {
    const {
      selectedOp: { name },
    } = inputs
    this.log(
      `\n💻 Run ${this.ux.colors.green('$')} ${this.ux.colors.italic.dim(
        'ops run ' + name,
      )} to test your op. \n`,
    )
    return inputs
  }

  async run() {
    try {
      await this.isLoggedIn()

      const listPipeline = asyncPipe(
        this.getOps,
        this.filterOutGlueCodes,
        this.promptOps,
        this.showRunMessage,
      )

      await listPipeline({})
    } catch (err) {
      this.debug('%0', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
