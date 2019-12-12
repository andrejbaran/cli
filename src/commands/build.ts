/**
 * Author: Brett Campbell (brett@hackcapital.com)
 * Date: Saturday, 6th April 2019 10:39:58 pm
 * Last Modified By: Brett Campbell (brett@hackcapital.com)
 * Last Modified Time: Saturday, 6th April 2019 10:40:00 pm
 *
 * DESCRIPTION
 *
 */
import { ux } from '@cto.ai/sdk'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as yaml from 'yaml'
import Command, { flags } from '~/base'
import { OP_FILE } from '~/constants/opConfig'
import {
  FileNotFoundError,
  MissingRequiredArgument,
  NoLocalOpsFound,
} from '~/errors/CustomErrors'
import { Config, Container, OpCommand, OpsYml } from '~/types'
import { asyncPipe, parseYaml } from '~/utils'

export interface BuildInputs {
  opPath: string
  config: Config
  ops: OpCommand[]
  opsToBuild: OpCommand[]
}
export default class Build extends Command {
  static description = 'Build your op for sharing.'

  static flags = {
    help: flags.help({ char: 'h' }),
  }

  static args = [
    { name: 'path', description: 'Path to the op you want to build.' },
  ]

  resolvePath = (inputs: BuildInputs): Pick<BuildInputs, 'opPath'> => {
    let { opPath } = inputs
    if (!opPath) throw new MissingRequiredArgument('ops [command]')
    opPath = path.resolve(process.cwd(), opPath)
    return { ...inputs, opPath }
  }

  getOpsFromFileSystem = async (inputs: BuildInputs): Promise<BuildInputs> => {
    const { opPath } = inputs
    const manifest = await fs
      .readFile(path.join(opPath, OP_FILE), 'utf8')
      .catch(err => {
        this.debug('%O', err)
        throw new FileNotFoundError(err, opPath, OP_FILE)
      })
    if (!manifest) {
      throw new NoLocalOpsFound()
    }
    const { ops }: OpsYml = parseYaml(manifest)
    if (!ops) {
      throw new NoLocalOpsFound()
    }
    return { ...inputs, ops }
  }

  selectOpToBuild = async (inputs: BuildInputs): Promise<BuildInputs> => {
    const { ops } = inputs
    if (ops.length === 1) {
      return { ...inputs, opsToBuild: ops }
    }
    const { opsToBuild } = await ux.prompt<Container<OpCommand[]>>({
      type: 'checkbox',
      name: 'opsToBuild',
      message: `\n Which ops would you like to build ${ux.colors.reset.green(
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
    return { ...inputs, opsToBuild }
  }

  executeOpService = async (inputs: BuildInputs): Promise<BuildInputs> => {
    const { opsToBuild, opPath, config } = inputs
    await this.services.opService.opsBuildLoop(opsToBuild, opPath, config)
    return inputs
  }

  async run(this: any) {
    const {
      args: { path },
    } = this.parse(Build)
    try {
      await this.isLoggedIn()
      const buildPipeline = asyncPipe(
        this.resolvePath,
        this.getOpsFromFileSystem,
        this.selectOpToBuild,
        this.executeOpService,
      )

      await buildPipeline({ opPath: path, config: this.state.config })
    } catch (err) {
      this.debug('%O', err)
      this.config.runHook('error', { err, accessToken: this.accessToken })
    }
  }
}
