import { OpCommand, OpWorkflow } from '.'
import { Config } from './Config'

export interface SearchInputs {
  config: Config
  filter: string
  apiOps: (OpCommand | OpWorkflow)[]
  selectedOp: OpCommand
}
