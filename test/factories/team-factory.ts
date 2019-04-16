import Team from '../../src/types/Team'
import * as faker from 'faker'

function generateTeam(teamName?: string, teamId?: string): Team {
  return {
    id: teamName || faker.random.word(),
    name: teamId || faker.random.uuid(),
    createdBy: faker.date.past().toString(),
    createdAt: faker.date.past().toString(),
    updatedAt: faker.date.past().toString(),
  }
}

export default generateTeam
