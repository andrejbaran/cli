import { Op, Workflow, Config } from '.'

export interface ListInputs {
  opResults: (Op | Workflow)[]
  selectedOp: Op | Workflow
  config: Config
}
