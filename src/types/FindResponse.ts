import { Op } from './Op'

// TODO: Add type for error
export type FindResponse = {
  data: Op[] | null
  error: object[] | null
}

export type FindQuery = {
  team_id: string
  name?: string
  search?: string
}
