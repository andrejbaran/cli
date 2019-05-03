import { Team } from '../../src/types'
import * as faker from 'faker'

function generateTeam(teamName?: string, teamId?: string): Team {
  return {
    id: teamName || faker.random.uuid(),
    name: teamId || faker.random.word(),
  }
}

export default generateTeam
