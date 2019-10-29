import { Op, Workflow } from '.'

export interface SearchInputs {
  filter: string
  apiOps: (Op | Workflow)[]
  localWorkflows: Workflow[]
  selectedOpOrWorkflow: Op | Workflow
}
