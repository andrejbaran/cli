import { ux } from '@cto.ai/sdk'
import { spawn, SpawnOptions } from 'child_process'
import Debug from 'debug'
import { v4 as uuid } from 'uuid'
import * as path from 'path'
import * as fs from 'fs-extra'
import {
  Workflow,
  Config,
  WorkflowPipelineError,
  ChildProcessError,
} from '~/types'
import { NoStepsFound, CouldNotMakeDir } from '~/errors/customErrors'
import { onExit, asyncPipe } from '~/utils'
import {
  replaceStateDirEnv,
  replaceConfigDirEnv,
} from '~/utils/stateAndConfigHelpers'
const debug = Debug('ops:WorkflowService')

const { callOutCyan, whiteBright, bold, redBright } = ux.colors

export class WorkflowService {
  async run(
    workflow: Workflow,
    opParams: string[],
    config: Config,
  ): Promise<void> {
    try {
      const { name, steps } = {
        ...workflow,
        steps: interpolateRunCmd(workflow, config.team.name),
      }
      workflow = getRunEnv(workflow, config)
      setRunEnv(workflow, config)

      const options: SpawnOptions = {
        stdio: 'inherit',
        shell: true,
        env: process.env,
      }

      const workflowCommands = steps.map(convertCommandToSpawnFunction(options))

      const errors: WorkflowPipelineError[] = []
      const workflowPipeline = asyncPipe(...workflowCommands)

      const finalOutput: {
        errors: WorkflowPipelineError[]
        args: string[]
      } = await workflowPipeline({
        errors,
        args: opParams,
      })
      const { errors: finalErrors } = finalOutput
      if (finalErrors.length) {
        console.log(`\n❗️  Workflow ${callOutCyan(name)} failed.`)
        finalErrors.forEach((error: WorkflowPipelineError, i: number) => {
          console.log(
            redBright(
              `🤔  There was a problem with the ${whiteBright(
                error.runCommand,
              )}.\n`,
            ),
          )
        })
      }
      !finalErrors.length &&
        _printMessage(
          `😌  Workflow ${callOutCyan(name)} completed successfully.`,
        )
    } catch (err) {
      debug('%0', err)
      throw err
    }
  }
}
const getRunEnv = (workflow: Workflow, config: Config): Workflow => {
  const runId: string = uuid()
  workflow.runId = runId
  const opsHome = `${process.env.HOME ||
    process.env.USERPROFILE}/.config/@cto.ai/ops`
  workflow.opsHome = opsHome === undefined ? '' : opsHome
  workflow.stateDir = `/${config.team.name}/${workflow.name}/${runId}`
  workflow.configDir = `/${config.team.name}/${workflow.name}`

  if (!fs.existsSync(workflow.stateDir)) {
    try {
      fs.ensureDirSync(path.resolve(workflow.opsHome + workflow.stateDir))
    } catch (err) {
      this.debug('%O', err)
      throw new CouldNotMakeDir()
    }
  }
  return workflow
}

const setRunEnv = (workflow: Workflow, config: Config): void => {
  process.env.STATE_DIR = workflow.stateDir
  process.env.CONFIG_DIR = workflow.configDir
  process.env.RUN_ID = workflow.runId
  process.env.OPS_OP_NAME = workflow.name
  process.env.OPS_TEAM_NAME = config.team.name
  process.env.OPS_ACCESS_TOKEN = config.accessToken
}

const interpolateRunCmd = (
  { steps, runId, name }: Pick<Workflow, 'steps' | 'runId' | 'name'>,
  teamName: string,
): string[] => {
  if (!steps.length) {
    throw new NoStepsFound()
  }
  return steps.map(step => {
    step = replaceStateDirEnv(step, teamName, name, runId)
    return replaceConfigDirEnv(step, teamName, name)
  })
}
const convertCommandToSpawnFunction = (options: SpawnOptions) => (
  runCommand: string,
): Function => {
  return _runWorkflow(options)(runCommand)
}

const _runWorkflow = (options: SpawnOptions) => _runWorkflowHof(options)

const _runWorkflowHof = (options: SpawnOptions) => (
  runCommand: string,
) => async ({
  errors,
  args,
}: {
  errors: WorkflowPipelineError[]
  args: string[]
}) => {
  console.log(`\n ${bold(`🏃  Running ${runCommand}`)} \n`, ``)

  const childProcess = spawn(runCommand, [], options)

  const exitResponse: void | ChildProcessError = await onExit(childProcess)

  if (exitResponse) {
    this.printMessage(`🏃  Running ${runCommand}`)
  }

  const newErrors = exitResponse
    ? [...errors, { exitResponse, runCommand }]
    : [...errors]
  return { errors: newErrors, args }
}

const _printMessage = (boldText: string, normalText: string = '') => {
  console.log(`\n ${bold(boldText)} ${normalText}\n`)
}
