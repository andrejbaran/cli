import { Config } from './Config'
import { OpCommand, OpWorkflow } from './OpsYml'
export interface RemoveInputs {
  config: Config
  op: string
  opTeamName: string
  opName: string
  opVersion: string
  opOrWorkflow: OpCommand | OpWorkflow
  confirmRemove: boolean
  deleteDescription: string
}
