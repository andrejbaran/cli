import { OpCommand, OpWorkflow } from '.'

export interface SearchInputs {
  filter: string
  apiOps: (OpCommand | OpWorkflow)[]
  selectedOp: OpCommand
}
