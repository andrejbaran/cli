import { Config, Membership } from '~/types'

export interface TeamRemoveInputs {
  creator: Membership
  members: Membership[]
  memberArg?: string
  memberToRemove: Membership
  config: Config
}
