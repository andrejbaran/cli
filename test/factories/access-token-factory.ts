import * as faker from 'faker'

function generateAccessToken(accessToken?: string): string {
  return faker.random.uuid()
}

export default generateAccessToken
