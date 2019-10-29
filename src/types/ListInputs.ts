import { Op, Workflow } from '.'

export interface ListInputs {
  opResults: (Op | Workflow)[]
  selectedOp: Op | Workflow
}
