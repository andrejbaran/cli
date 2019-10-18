import { OpsYml, Workflow, Op } from '~/types'
import * as yaml from 'yaml'
import { IncompleteOpsYml } from '~/errors/CustomErrors'

const checkCommandNecessryFields = (commandContents: Op) => {
  if (!commandContents.run || typeof commandContents.run !== 'string') {
    throw new IncompleteOpsYml('The run command must be included as a string')
  }
}

const checkWorkflowNecessryFields = (workflowContents: Workflow) => {
  if (!workflowContents.steps || !workflowContents.steps.length) {
    throw new IncompleteOpsYml('The run command must be included as a string')
  }
  workflowContents.steps.forEach(step => {
    if (!step || typeof step !== 'string') {
      throw new IncompleteOpsYml('Each step should be a non-empty string')
    }
  })
}

const checkOpNecessaryFields = (opContents: Op | Workflow) => {
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

export const parseYaml = (manifest: string): OpsYml => {
  const yamlContents: any = manifest && yaml.parse(manifest)

  if (!yamlContents) throw new IncompleteOpsYml('Ops.yml is empty')

  if (yamlContents.ops) {
    yamlContents.ops = yamlContents.ops.map(op => {
      const newOp = { ...op }
      newOp.isPublic = newOp.public
      delete newOp.public
      checkOpNecessaryFields(newOp)
      checkCommandNecessryFields(newOp)
      return newOp
    })
  }

  if (yamlContents.workflows) {
    yamlContents.workflows = yamlContents.workflows.map(wf => {
      const newWf = { ...wf }
      newWf.isPublic = newWf.public
      delete newWf.public
      checkOpNecessaryFields(newWf)
      checkWorkflowNecessryFields(newWf)
      return newWf
    })
  }

  return yamlContents
}
