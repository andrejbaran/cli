import * as path from 'path'
import { OpCommand, OpWorkflow, Config } from '~/types'

export const createStateDirEnv = (
  teamName: string,
  opOrWorkflowName: string,
  runId: string,
) => {
  return path.resolve(`/${teamName}/${opOrWorkflowName}/${runId}`)
}
export const createConfigDirEnv = (
  teamName: string,
  opOrWorkflowName: string,
) => {
  return path.resolve(`/${teamName}/${opOrWorkflowName}`)
}

export const replaceStateDirEnv = (
  runOrStep: string,
  teamName: string,
  opOrWorkflowName: string,
  runId: string,
): string => {
  return runOrStep.replace(
    '{{OPS_STATE_DIR}}',
    createStateDirEnv(teamName, opOrWorkflowName, runId),
  )
}

export const replaceConfigDirEnv = (
  runOrStep: string,
  teamName: string,
  opOrWorkflowName: string,
): string => {
  return runOrStep.replace(
    '{{OPS_CONFIG_DIR}}',
    createConfigDirEnv(teamName, opOrWorkflowName),
  )
}
