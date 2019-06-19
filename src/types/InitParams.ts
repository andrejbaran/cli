import { OpTypes } from '../constants/opConfig'

export interface InitParams {
  opName: string | undefined
  opDescription: string | undefined
  workflowName: string | undefined
  workflowDescription: string | undefined
  templates: OpTypes[]
  help?: void
}
