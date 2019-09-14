import { OpTypes } from '../constants/opConfig'

export interface InitParams {
  commandName: string | undefined
  commandDescription: string | undefined
  workflowName: string | undefined
  workflowDescription: string | undefined
  templates: OpTypes[]
  help?: void
}
