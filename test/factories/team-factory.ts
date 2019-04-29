import Team from '../../src/types/Team'
import * as faker from 'faker'

function generateTeam(teamName?: string, teamId?: string): Team {
  return {
    id: teamName || faker.random.word(),
    name: teamId || faker.random.uuid(),
  }
}

export default generateTeam
