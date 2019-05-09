import { IOp } from './IOp'

// TODO: Add type for error
export type ApiResponse = {
  data: IOp[] | null
  error: object[] | null
}
