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
        `teams/${inputs.config.team.name}/ops`,
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
    const commandText = multiBlue('\u2022Command')
    const workflowText = multiOrange('\u2022Workflow')
    const teamText = secondary(`@${name}`)
    const subHeader = reset.dim(
      '🌎 = Public 🔑 = Private 🖥  = Local  🔍 Search:',
    )
    const { selectedOp } = await this.ux.prompt<{ selectedOp: Op | Workflow }>({
      type: 'autocomplete',
      name: 'selectedOp',
      pageSize: 5,
      message: `\nListing ops for team ${teamText}${callOutCyan(
        `. Select a ${commandText} or ${workflowText} to continue ${reset.green(
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

  _formatOpOrWorkflowName = (op: Op | Workflow) => {
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
    await this.services.analytics.track(
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
      const { config } = this.state

      const listPipeline = asyncPipe(
        this.getApiOps,
        this.getLocalOps,
        this.filterOutGlueCodes,
        this.promptOps,
        this.sendAnalytics,
        this.showRunMessage,
      )

      await listPipeline({ config })
    } catch (err) {
      this.debug('%0', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
