import { Config, Team, Membership } from '~/types'

export interface InfoInputs {
  activeTeam: Team
  creator: Membership
  members: Membership[]
  config: Config
}
