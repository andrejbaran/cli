import { OpCommand } from './OpsYml'

export type OpsGetResponse = {
  data: OpCommand
  error: object[] | null
}
