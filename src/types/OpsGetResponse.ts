import { Op } from './OpsYml'

export type OpsGetResponse = {
  data: Op
  error: object[] | null
}
