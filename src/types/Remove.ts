import { Config } from './Config'
import { Op, Workflow } from './OpsYml'
export interface RemoveInputs {
  config: Config
  op: string
  opTeamName: string
  opName: string
  opVersion: string
  opOrWorkflow: Op | Workflow
  confirmRemove: boolean
  deleteDescription: string
}
