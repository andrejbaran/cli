import { OpCommand, OpWorkflow, Config } from '.'

export interface ListInputs {
  opResults: (OpCommand | OpWorkflow)[]
  selectedOp: OpCommand | OpWorkflow
  config: Config
}
