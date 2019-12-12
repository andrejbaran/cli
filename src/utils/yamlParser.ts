import { ux } from '@cto.ai/sdk'
import { OpsYml, OpWorkflow, OpCommand } from '~/types'
import * as yaml from 'yaml'
import { IncompleteOpsYml } from '~/errors/CustomErrors'
import { WORKFLOW_TYPE, COMMAND_TYPE, COMMAND } from '../constants/opConfig'

const { white, callOutCyan } = ux.colors
const checkCommandNecessryFields = (commandContents: OpCommand) => {
  if (!commandContents.run || typeof commandContents.run !== 'string') {
    throw new IncompleteOpsYml('The run command must be included as a string')
  }
}

const checkWorkflowNecessryFields = (workflowContents: OpWorkflow) => {
  if (!workflowContents.steps || !workflowContents.steps.length) {
    throw new IncompleteOpsYml('The run command must be included as a string')
  }
  workflowContents.steps.forEach(step => {
    if (!step || typeof step !== 'string') {
      throw new IncompleteOpsYml('Each step should be a non-empty string')
    }
  })
}

const checkOpNecessaryFields = (opContents: OpCommand | OpWorkflow) => {
  if (!opContents.name || typeof opContents.name !== 'string') {
    throw new IncompleteOpsYml('Op name must be a non-empty string')
  }
  if (!opContents.description || typeof opContents.description !== 'string') {
    throw new IncompleteOpsYml('Op description must be a non-empty string')
  }
  if (
    !opContents.isPublic === undefined ||
    typeof opContents.isPublic !== 'boolean'
  ) {
    throw new IncompleteOpsYml(
      'Your ops.yml file is missing the public field, please add `public:false` to publish your op as private',
    )
  }
  return true
}

const _splitOpNameAndVersion = (
  op: OpCommand | OpWorkflow,
): [string, string] => {
  const splits = op.name.split(':')
  return [splits[0], splits[1]]
}

export const parseYaml = (manifest: string): OpsYml => {
  const { version, ops = [], workflows = [], commands = [] } =
    manifest && yaml.parse(manifest)
  let yamlContents: OpsYml = {
    version,
    ops: [],
    workflows: [],
  }
  if (ops.length > 0) {
    console.log(
      white(
        `It looks like your ops.yml is a little out of date.\nYou should replace the ${callOutCyan(
          'ops',
        )} field with ${callOutCyan('commands')}.\nLearn more here ${ux.url(
          'https://cto.ai/docs/ops-reference',
          'https://cto.ai/docs/ops-reference',
        )}`,
      ),
    )
    const parsedOps = ops.map(op => {
      const newCommand = formatRequiredFields(op, COMMAND_TYPE)
      checkOpNecessaryFields(newCommand)
      checkCommandNecessryFields(newCommand)
      return newCommand
    })
    yamlContents.ops = [...yamlContents.ops, ...parsedOps]
  }

  if (commands.length > 0) {
    const parsedCommands = commands.map(op => {
      const newCommand = formatRequiredFields(op, COMMAND_TYPE)
      checkOpNecessaryFields(newCommand)
      checkCommandNecessryFields(newCommand)
      return newCommand
    })
    yamlContents.ops = [...yamlContents.ops, ...parsedCommands]
  }

  if (workflows.length > 0) {
    yamlContents.workflows = workflows.map(wf => {
      const newWf = formatRequiredFields(wf, WORKFLOW_TYPE)
      checkOpNecessaryFields(newWf)
      checkWorkflowNecessryFields(newWf)
      return newWf
    })
  }

  return yamlContents
}

const formatRequiredFields = (opOrWorkflow, type) => {
  const defaultVersion = `0.1.0`
  const defaultVersionLog = `\nℹ️  It looks like your ops.yml is a little out of date. It does not have a version, we are setting the default version to ${ux.colors.callOutCyan(
    defaultVersion,
  )}. Learn more ${ux.url('here', 'https://cto.ai/docs/ops-reference')}.\n`
  const newOp = { ...opOrWorkflow }
  newOp.isPublic = newOp.public
  delete newOp.public
  let [opName, opVersion] = _splitOpNameAndVersion(opOrWorkflow)
  if (!opVersion) {
    opVersion = defaultVersion
    console.log(defaultVersionLog)
  }
  newOp.name = opName
  newOp.version = opVersion
  newOp.type = type
  return newOp
}
