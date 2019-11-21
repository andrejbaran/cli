/**
 * @author: Prachi Singh (prachi@hackcapital.com)
 * @date: Tuesday, 5th November 2019 1:11:40 pm
 * @lastModifiedBy: Prachi Singh (prachi@hackcapital.com)
 * @lastModifiedTime: Monday, 18th November 2019 4:28:12 pm
 *
 * DESCRIPTION: ops add
 *
 * @copyright (c) 2019 Hack Capital
 */

import fuzzy from 'fuzzy'
import Command, { flags } from '../base'
import { ux } from '@cto.ai/sdk'
import {
  APIError,
  OpAlreadyBelongsToTeam,
  OpNotFoundOpsAdd,
  OpAlreadyAdded,
} from '~/errors/CustomErrors'
import { isValidOpFullName } from '~/utils/validate'
import { asyncPipe } from '~/utils'
import { Answers, Fuzzy, Op, OpsFindResponse, Workflow, Config } from '../types'
import { WORKFLOW_TYPE } from '../constants/opConfig'
import { GLUECODE_TYPE } from '../constants/opConfig'

type OpFilter = {
  opTeamName: string
  opName: string
  opVersionName: string
}

interface AddInputs {
  opName: string
  config: Config
  ops: (Op | Workflow)[]
  opFilter: OpFilter
  addedOpID: number
}

export default class Add extends Command {
  static description = 'Add an op to your team.'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = [
    {
      name: 'opName',
      description:
        'Name of the public op to be added to your team. It should be of the format - @teamname/opName:versionName',
    },
  ]

  ops: (Op | Workflow)[] = []

  promptFilter = async (inputs: AddInputs): Promise<AddInputs> => {
    if (inputs.opName) return inputs
    const answers = await ux.prompt<{ opName: string }>({
      type: 'input',
      name: 'opName',
      message: `\n Please type in the name of the public op you want to add ${ux.colors.reset.green(
        '→',
      )}\n ${ux.colors.reset(
        ux.colors.secondary(
          `Leave blank to list all public ops that you can add`,
        ),
      )} \n\n 🗑  ${ux.colors.reset.white('Name')}`,
    })
    const opName = answers.opName
    return { ...inputs, opName }
  }

  isOpAlreadyInTeam = (
    opResults: (Op | Workflow)[],
    opName: string,
    opTeamName: string,
    opVersionName: string,
    myTeamName: string,
  ) => {
    if (opTeamName === myTeamName) return true

    const result = opResults.filter(
      op =>
        op.name == opName &&
        op.teamName == opTeamName &&
        op.version == opVersionName,
    )
    return Boolean(result.length)
  }

  getAllMyOps = async (config: Config) => {
    try {
      const {
        data: opResults,
      }: { data: (Op | Workflow)[] } = await this.services.api.find(
        `teams/${config.team.name}/ops`,
        {
          headers: {
            Authorization: config.tokens.accessToken,
          },
        },
      )
      return opResults
    } catch (err) {
      this.debug('%0', err)
      throw new APIError(err)
    }
  }

  getAllPublicOps = async (inputs: AddInputs): Promise<AddInputs> => {
    if (inputs.opName) return inputs
    try {
      const findResponse: OpsFindResponse = await this.services.api.find(
        `/ops`,
        {
          headers: {
            Authorization: inputs.config.tokens.accessToken,
          },
        },
      )
      let { data: apiOps } = findResponse
      apiOps = apiOps.filter(op => op.type !== GLUECODE_TYPE)
      const myOps = await this.getAllMyOps(inputs.config)
      apiOps = apiOps.filter(op => {
        const flag = this.isOpAlreadyInTeam(
          myOps,
          op.name,
          op.teamName,
          op.version,
          inputs.config.team.name,
        )
        return !flag
      })
      this.ops = apiOps
      return { ...inputs, ops: apiOps }
    } catch (err) {
      this.debug('error: %O', err)
      throw new APIError(err)
    }
  }

  private _fuzzyFilterParams = () => {
    const list = this.ops.map(op => {
      const { name, teamName, version } = op
      const opDisplayName = this._formatOpOrWorkflowName(op)
      const opFullName = `@${teamName}/${name}:${version}`
      return {
        name: `${opDisplayName} - ${op.description || op.publishDescription}`,
        value: opFullName,
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
      return `${reset(multiOrange('\u2022'))} ${name}`
    } else {
      return `${reset(multiBlue('\u2022'))} ${name}`
    }
  }

  private _autocompleteSearch = async (_: Answers, input = '') => {
    const { list, options } = this._fuzzyFilterParams()
    const fuzzyResult: Fuzzy[] = fuzzy.filter(input, list, options)
    return fuzzyResult.map(result => result.original)
  }

  selectOpPrompt = async (inputs: AddInputs): Promise<AddInputs> => {
    if (inputs.opName) return inputs
    const commandText = ux.colors.multiBlue('\u2022Command')
    const workflowText = ux.colors.multiOrange('\u2022Workflow')
    const result = await this.ux.prompt<{ selectedOp: string }>({
      type: 'autocomplete',
      name: 'selectedOp',
      pageSize: 5,
      message: `\nSelect a public ${commandText} or ${workflowText} to add ${this.ux.colors.reset.green(
        '→',
      )}\n${this.ux.colors.reset.dim('🔍 Search:')} `,
      source: this._autocompleteSearch.bind(this),
      bottomContent: `\n \n${this.ux.colors.white(
        `Or, run ${this.ux.colors.callOutCyan(
          'ops help',
        )} for usage information.`,
      )}`,
    })
    const opName = result.selectedOp
    return { ...inputs, opName }
  }

  checkValidOpName = async (inputs: AddInputs): Promise<AddInputs> => {
    if (!isValidOpFullName(inputs.opName)) {
      this.log(
        `❗ Oops, that's an invalid input. Try adding the op in this format ${ux.colors.callOutCyan(
          `@teamname/opname:versionname`,
        )}`,
      )
      process.exit()
    }
    return inputs
  }

  // @teamname/opname:versionname => {teamname, opname, versionname}
  splitOpName = (inputs: AddInputs): AddInputs => {
    const [field1, field2] = inputs.opName.split('/')
    const opTeamName = field1.substring(1)
    const [opName, opVersionName] = field2.split(':')

    const opFilter = {
      opTeamName,
      opName,
      opVersionName,
    }
    return {
      ...inputs,
      opFilter,
    }
  }

  addOp = async (inputs: AddInputs): Promise<AddInputs> => {
    const { opTeamName, opName, opVersionName } = inputs.opFilter
    if (opTeamName === inputs.config.team.name) {
      throw new OpAlreadyBelongsToTeam()
    }
    try {
      const { data: result } = await this.services.api.create(
        `teams/${inputs.config.team.name}/ops/refs`,
        { opName, opTeamName, versionName: opVersionName },
        {
          headers: {
            Authorization: inputs.config.tokens.accessToken,
          },
        },
      )
      return { ...inputs, addedOpID: result }
    } catch (err) {
      this.debug('%0', err)
      if (err.error[0].message === 'op not found') {
        throw new OpNotFoundOpsAdd()
      } else if (
        err.error[0].message ===
        'cannot create duplicate op reference for the same team'
      ) {
        throw new OpAlreadyAdded()
      }
      throw new APIError(err)
    }
  }

  sendAnalytics = async (inputs: AddInputs) => {
    this.services.analytics.track(
      {
        userId: inputs.config.user.id,
        teamId: inputs.config.team.id,
        cliEvent: 'Ops CLI Add',
        event: 'Ops CLI Add',
        properties: {},
      },
      inputs.config.tokens.accessToken,
    )
    return inputs
  }

  getSuccessMessage = (inputs: AddInputs): AddInputs => {
    this.log(
      `\n🎉 Good job! ${ux.colors.callOutCyan(
        `${inputs.opName}`,
      )} has been successfully added to your team. \n\n Type ${this.ux.colors.italic.dim(
        'ops list',
      )} to find this op in your list of ops.\n`,
    )
    return inputs
  }

  async run() {
    try {
      await this.isLoggedIn()

      const {
        args: { opName },
      } = this.parse(Add)

      await this.isLoggedIn()
      const addPipeline = asyncPipe(
        this.promptFilter,
        this.getAllPublicOps,
        this.selectOpPrompt,
        this.checkValidOpName,
        this.splitOpName,
        this.addOp,
        this.sendAnalytics,
        this.getSuccessMessage,
      )

      await addPipeline({ opName, config: this.state.config })
    } catch (err) {
      this.debug('%0', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
