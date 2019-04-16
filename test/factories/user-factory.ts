import User from '../../src/types/User'
import * as faker from 'faker'

function generateUser(username?: string, email?: string, id?: any): User {
  return {
    _id: id || faker.random.uuid(),
    username: username || faker.internet.userName(),
    email: email || faker.internet.email(),
  }
}

export default generateUser
