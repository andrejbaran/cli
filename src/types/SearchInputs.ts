import { OpCommand, OpWorkflow } from '.'

export interface SearchInputs {
  filter: string
  apiOps: (OpCommand | OpWorkflow)[]
  localWorkflows: OpWorkflow[]
  selectedOpOrWorkflow: OpCommand | OpWorkflow
}
