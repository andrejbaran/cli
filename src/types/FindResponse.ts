import { Op, Workflow } from './OpsYml'

// TODO: Add type for error
export type OpsFindResponse = {
  data: Op[]
  error: object[] | null
}

export type OpsFindQuery = {
  team_id: string
  name?: string
  search?: string
}

export type WorkflowsFindResponse = {
  data: Workflow[]
  error: object[] | null
}

export type WorkflowsFindQuery = {
  teamId: string
  name?: string
  search?: string
}
